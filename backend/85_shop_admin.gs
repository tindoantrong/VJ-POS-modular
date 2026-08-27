// ═══════════════════════════════════════════════════════════
// VJ-POS Apps Script — 85_shop_admin.gs
// Công cụ cho NHÂN VIÊN xử lý đơn web NGAY TRONG GOOGLE SHEETS:
// menu "VJ-POS" trên thanh công cụ + dropdown và màu cho cột status của Shop_Orders.
//
// KHÔNG có gì ở file này chạy qua doGet/doPost. Nó chỉ hoạt động khi có người mở
// spreadsheet, nên thêm/sửa file này KHÔNG cần Deploy lại web app — push code là xong.
//
// Vì sao xử lý trên sheet chứ không phải trong POS: đơn web mới là đơn CHỜ XÁC NHẬN
// (xem docs/SHOP.md). Nhân viên gọi điện rồi đánh dấu, thế là đủ. Khi nào cần xử lý
// trên điện thoại thì mới dựng màn hình riêng trong POS.
//
// ⚠️ onOpen chỉ chạy được vì script này GẮN VỚI SPREADSHEET (container-bound).
//    Tách ra thành project độc lập là menu biến mất.
// ═══════════════════════════════════════════════════════════

/* Màu nền cả dòng theo trạng thái. Chọn tông nhạt để chữ đen vẫn đọc rõ.
   Đỏ nhạt cho NEW là có chủ ý: mở sheet ra là đập vào mắt đơn chưa ai gọi. */
const SHOP_STATUS_STYLE = {
  NEW:       { bg: "#FCE4E2", note: "Mới đặt — chưa ai gọi" },
  CONFIRMED: { bg: "#E1EEFB", note: "Đã gọi xác nhận" },
  SHIPPED:   { bg: "#FFF2CC", note: "Đang giao" },
  DONE:      { bg: "#E2F0E4", note: "Xong" },
  CANCELLED: { bg: "#EFEFEF", fg: "#8A8A8A", strike: true, note: "Huỷ / khách bỏ bom" },
};

// ═══ MENU ═══

/* Simple trigger — Google tự gọi mỗi lần mở spreadsheet. Không được ném lỗi, nếu
   không thì menu không hiện mà cũng chẳng báo gì. */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("VJ-POS")
      .addItem("✅ Đã gọi, xác nhận đơn", "shopMarkConfirmed")
      .addItem("🚚 Đã giao cho shipper", "shopMarkShipped")
      .addItem("🎉 Giao xong, hoàn tất", "shopMarkDone")
      .addItem("✖️ Huỷ đơn", "shopMarkCancelled")
      .addSeparator()
      .addItem("↩️ Trả về chưa gọi", "shopMarkNew")
      .addSeparator()
      .addItem("🎨 Cài lại dropdown + màu cho Shop_Orders", "setupShopOrdersUi")
      .addToUi();
  } catch (_) {}
}

function shopMarkConfirmed() { _shopSetStatus_("CONFIRMED"); }
function shopMarkShipped()   { _shopSetStatus_("SHIPPED"); }
function shopMarkDone()      { _shopSetStatus_("DONE"); }
function shopMarkCancelled() { _shopSetStatus_("CANCELLED"); }
function shopMarkNew()       { _shopSetStatus_("NEW"); }

/* Điền status + handled_by + handled_at cho mọi dòng đang được chọn.

   Không gỡ protection và không khoá:
   - protection của sheet là setWarningOnly (xem _tryReprotect_ trong 20_sheets.gs),
     nó chỉ cảnh báo người gõ tay chứ không chặn script;
   - đơn khách đặt luôn append xuống cuối sheet nên không làm xê dịch số dòng của
     đơn đang sửa, không có gì để tranh chấp. */
function _shopSetStatus_(status) {
  const ui = SpreadsheetApp.getUi();
  const ws = SS.getActiveSheet();

  if (ws.getName() !== "Shop_Orders") {
    ui.alert("Menu này chỉ dùng ở tab Shop_Orders.\n\nBạn đang đứng ở tab: " + ws.getName());
    return;
  }

  const rows = _shopSelectedDataRows_(ws);
  if (!rows.length) {
    ui.alert(
      "Chưa chọn đơn nào.\n\n" +
      "Bấm vào một ô bất kỳ trên dòng của đơn cần đổi, rồi chọn lại menu.\n" +
      "Bôi đen nhiều dòng thì đổi được cả loạt."
    );
    return;
  }

  // Đọc theo TÊN CỘT chứ không theo vị trí — chèn thêm cột vào sheet vẫn chạy đúng
  const h = _hmap_(ws);
  const cStatus = _col_(h, ["status"]);
  const cBy = _col_(h, ["handled_by"]);
  const cAt = _col_(h, ["handled_at"]);
  const cId = _col_(h, ["shop_order_id", "order_id", "id"]);

  if (cStatus < 0) {
    ui.alert("Sheet Shop_Orders không có cột 'status'.\nChạy setupNewSpreadsheet() để dựng lại header chuẩn.");
    return;
  }

  const who = _shopCurrentUser_();
  const now = _nowStr_();
  const ids = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    ws.getRange(r, cStatus + 1).setValue(status);
    if (cBy >= 0) ws.getRange(r, cBy + 1).setValue(who);
    if (cAt >= 0) ws.getRange(r, cAt + 1).setValue(now);
    if (cId >= 0) ids.push(String(ws.getRange(r, cId + 1).getValue() || ("dòng " + r)));
  }

  SS.toast(
    (ids.length ? ids.join(", ") : rows.length + " dòng") + " → " + status,
    "Đã cập nhật " + rows.length + " đơn",
    5
  );
}

/* Số dòng dữ liệu đang được chọn, đã loại dòng header và phần vùng chọn tràn xuống
   dưới dữ liệu (bấm vào chữ cái đầu cột là chọn luôn cả nghìn dòng trống). */
function _shopSelectedDataRows_(ws) {
  const lastRow = ws.getLastRow();
  let ranges = [];
  try {
    ranges = ws.getActiveRangeList().getRanges();
  } catch (_) {
    const one = ws.getActiveRange();
    if (one) ranges = [one];
  }

  const seen = {};
  const out = [];
  for (let i = 0; i < ranges.length; i++) {
    const rg = ranges[i];
    if (!rg) continue;
    const start = rg.getRow();
    const end = start + rg.getNumRows() - 1;
    for (let r = start; r <= end; r++) {
      if (r < 2 || r > lastRow) continue;
      if (seen[r]) continue;
      seen[r] = true;
      out.push(r);
    }
  }
  out.sort(function (a, b) { return a - b; });
  return out;
}

/* Ai bấm menu. Ghi email Google chứ không phải staff_id của POS — người sửa sheet
   đăng nhập bằng tài khoản Google, không qua PIN. getActiveUser() trả rỗng khi
   người dùng khác miền với chủ file, nên phải có bậc dự phòng. */
function _shopCurrentUser_() {
  try {
    const e = Session.getActiveUser().getEmail();
    if (e) return e;
  } catch (_) {}
  try {
    const e = Session.getEffectiveUser().getEmail();
    if (e) return e;
  } catch (_) {}
  return "sheet";
}

// ═══ DROPDOWN + MÀU ═══

// Bản có hộp thoại, dùng cho menu
function setupShopOrdersUi() {
  const ui = SpreadsheetApp.getUi();
  const res = _applyShopOrdersUi_();
  if (!res.ok) { ui.alert(res.error); return; }
  ui.alert(
    "Xong.\n\n" +
    "• Cột " + res.statusColumn + " (status) giờ là dropdown: " + SHOP_STATUSES.join(" · ") + "\n" +
    "• Gõ giá trị lạ sẽ bị từ chối\n" +
    "• Cả dòng đổi màu theo trạng thái — nền đỏ nhạt là đơn chưa ai gọi"
  );
}

/* Bản không đụng UI, gọi được từ setupNewSpreadsheet() và từ editor.
   Chạy lại bao nhiêu lần cũng ra cùng kết quả.

   ⚠️ setConditionalFormatRules THAY TOÀN BỘ quy tắc màu của sheet Shop_Orders — đó
      chính là cách để chạy lại không bị nhân đôi quy tắc. Hệ quả: ai tự thêm định dạng
      có điều kiện cho sheet này bằng tay sẽ bị xoá. Muốn thêm màu thì khai báo vào
      SHOP_STATUS_STYLE ở trên, đừng gõ tay trong Sheets. */
function _applyShopOrdersUi_() {
  const ws = SS.getSheetByName("Shop_Orders");
  if (!ws) return { ok: false, error: "Chưa có sheet Shop_Orders. Chạy setupNewSpreadsheet() trước." };

  const cStatus = _col_(_hmap_(ws), ["status"]);
  if (cStatus < 0) return { ok: false, error: "Sheet Shop_Orders không có cột 'status'." };

  const maxRows = ws.getMaxRows();
  if (maxRows < 2) return { ok: false, error: "Sheet Shop_Orders chưa có dòng nào dưới header." };

  const lastCol = Math.max(1, ws.getLastColumn());
  const statusA1 = _a1Col_(cStatus + 1);

  // 1) Dropdown chặn gõ sai
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(SHOP_STATUSES, true)
    .setAllowInvalid(false)
    .setHelpText("Chỉ nhận: " + SHOP_STATUSES.join(" · "))
    .build();
  ws.getRange(2, cStatus + 1, maxRows - 1, 1).setDataValidation(rule);

  /* 2) Màu CẢ DÒNG chứ không riêng ô status — để lướt mắt là thấy ngay đơn nào chưa gọi.
        Công thức khoá cột ($K) mà không khoá dòng (2), nhờ vậy một quy tắc áp cho mọi
        dòng bên dưới. */
  const target = ws.getRange(2, 1, maxRows - 1, lastCol);
  const rules = [];
  for (let i = 0; i < SHOP_STATUSES.length; i++) {
    const st = SHOP_STATUSES[i];
    const style = SHOP_STATUS_STYLE[st] || {};
    let b = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$' + statusA1 + '2="' + st + '"')
      .setBackground(style.bg || "#FFFFFF")
      .setRanges([target]);
    if (style.fg) b = b.setFontColor(style.fg);
    if (style.strike) b = b.setStrikethrough(true);
    rules.push(b.build());
  }
  ws.setConditionalFormatRules(rules);

  return { ok: true, statusColumn: statusA1, statuses: SHOP_STATUSES.length };
}

// Chỉ số cột 1-based → chữ cái A1 ("K"). Cần cho công thức định dạng có điều kiện.
function _a1Col_(n) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = (n - m - 1) / 26;
  }
  return s;
}
