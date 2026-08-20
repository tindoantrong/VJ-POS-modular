// ═══════════════════════════════════════════════════════════
// VJ-POS Apps Script — 98_setup.gs
// Dựng cấu trúc 7 sheet cho một spreadsheet TRỐNG HOÀN TOÀN.
//
// CÁCH DÙNG: mở editor Apps Script → chọn hàm setupNewSpreadsheet → Run.
// Chạy lại nhiều lần được: sheet nào đã có thì BỎ QUA, không đụng vào dữ liệu.
//
// Xem hướng dẫn từng bước ở docs/SETUP.md
// ═══════════════════════════════════════════════════════════

/* Tên cột chuẩn của từng sheet.
   Thứ tự cột được chọn khớp với "bố cục dự phòng v2.0" trong code, nên kể cả khi dòng
   header bị xoá nhầm thì app vẫn đọc đúng. Muốn thêm cột thì thêm vào CUỐI danh sách. */
const SHEET_TEMPLATES = {
  Admin_Staff: [
    "staff_id", "name", "role", "active", "pin"
  ],

  Admin_Products: [
    "product_id", "ten_hang", "loai_hang", "nhom_hang", "brand_id",
    "gia_ban", "gia_von", "qty_on_hand", "image_url", "active"
  ],

  Admin_Artists: [
    "artist_id", "name", "type", "commission_rate_to_staff", "active"
  ],

  Orders: [
    "order_id", "order_date", "staff_id", "customer_name", "customer_phone",
    "base_cost_total", "discount_total", "bill_disc_amt", "bill_disc_pct",
    "net_commission_base", "card_fee_amt", "ship_amt", "grand_total", "notes", "status",
    "extra_fee_total", "collected_total", "collected_for_commission",
    "payment_status", "commission_paid_total"
  ],

  // submitOrder ghi cả key "cat" lẫn "nhom_hang" cùng một giá trị để hợp với nhiều kiểu đặt
  // tên sheet khác nhau. Ở đây chọn "cat"; key "nhom_hang" bị bỏ qua — đúng như thiết kế.
  Order_Items: [
    "order_item_id", "order_id", "product_id", "product_name", "brand_id", "cat",
    "qty", "unit_price", "line_discount_amount", "line_net_commission_base",
    "staff_id", "staff_commission_rate", "commission_full",
    "line_base_cost", "commission_paid"
  ],

  Payments: [
    "payment_id", "order_id", "payment_date", "method",
    "amount_total", "amount_for_commission", "note"
  ],

  // ⚠️ Sheet này _logStock_ ghi theo VỊ TRÍ cột, không theo header. Đừng đổi thứ tự.
  Admin_Stock_Log: [
    "log_id", "timestamp", "product_id", "change_type",
    "qty_change", "qty_before", "qty_after", "reference", "changed_by"
  ],
};

/* ═══ CHẠY HÀM NÀY ĐẦU TIÊN ═══
   Tạo các sheet còn thiếu kèm dòng header, đóng băng dòng 1, in đậm header.
   KHÔNG xoá, KHÔNG sửa sheet đã có sẵn. */
function setupNewSpreadsheet() {
  const created = [];
  const skipped = [];

  for (const name in SHEET_TEMPLATES) {
    let ws = SS.getSheetByName(name);

    if (ws) {
      skipped.push(name + " (đã có, giữ nguyên)");
      continue;
    }

    ws = SS.insertSheet(name);
    const headers = SHEET_TEMPLATES[name];

    ws.getRange(1, 1, 1, headers.length).setValues([headers]);
    ws.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#10121A")
      .setFontColor("#B0C4D8");
    ws.setFrozenRows(1);

    // Cắt bớt cột thừa cho sheet gọn, giữ dư 2 cột để sau này thêm
    const keep = headers.length + 2;
    if (ws.getMaxColumns() > keep) {
      ws.deleteColumns(keep + 1, ws.getMaxColumns() - keep);
    }

    created.push(name + " (" + headers.length + " cột)");
  }

  // Xoá sheet "Sheet1"/"Trang tính1" mặc định nếu còn trống
  _removeDefaultEmptySheet_();

  const report = {
    ok: true,
    created: created,
    skipped: skipped,
    next: "Chạy tiếp seedStarterData() nếu muốn có sẵn 1 tài khoản quản lý để đăng nhập thử."
  };
  Logger.log(JSON.stringify(report, null, 2));
  return report;
}

/* ═══ CHẠY HÀM NÀY THỨ HAI (tuỳ chọn) ═══
   Nạp dữ liệu mồi tối thiểu để đăng nhập và bán thử được ngay.
   Chỉ ghi vào sheet đang TRỐNG (chỉ có dòng header) — không bao giờ ghi đè dữ liệu thật. */
function seedStarterData() {
  const done = [];
  const skipped = [];

  // ── 1 tài khoản quản lý ──
  if (_isEmptySheet_("Admin_Staff")) {
    _appendByHeader_(_sheet_("Admin_Staff"), {
      staff_id: "S001", name: "Quản lý", role: "manager", active: true, pin: "1234"
    });
    done.push("Admin_Staff: S001 / PIN 1234 — ⚠️ ĐỔI PIN NGAY");
  } else {
    skipped.push("Admin_Staff (đã có dữ liệu)");
  }

  // ── Brand + tỉ lệ hoa hồng. rate 0.05 = 5% ──
  if (_isEmptySheet_("Admin_Artists")) {
    const ws = _sheet_("Admin_Artists");
    const rows = [
      ["KS", "Kim Silver", "consign", 0.05, true],
      ["CH", "Charm House", "consign", 0.05, true],
      ["OR", "Hàng đặt riêng", "order", 0.02, true],
      ["SV", "Dịch vụ tại tiệm", "service", 0.10, true],
    ];
    rows.forEach(function (r) {
      _appendByHeader_(ws, {
        artist_id: r[0], name: r[1], type: r[2], commission_rate_to_staff: r[3], active: r[4]
      });
    });
    done.push("Admin_Artists: 4 brand mẫu");
  } else {
    skipped.push("Admin_Artists (đã có dữ liệu)");
  }

  // ── Vài sản phẩm mẫu để thử luồng bán ──
  if (_isEmptySheet_("Admin_Products")) {
    const ws = _sheet_("Admin_Products");
    const rows = [
      ["KSR001", "Nhẫn bạc trơn", "RING", "RING", "KS", 1000000, 600000, 10, "", true],
      ["KSN001", "Dây chuyền bạc", "NECKLACE", "NECKLACE", "KS", 1500000, 900000, 5, "", true],
      ["CHB001", "Vòng tay charm", "BRACELET", "BRACELET", "CH", 850000, 500000, 8, "", true],
      ["SVG001", "Gắn đá răng", "TOOTHGEM", "TOOTHGEM", "SV", 500000, 100000, 0, "", true],
    ];
    rows.forEach(function (r) {
      _appendByHeader_(ws, {
        product_id: r[0], ten_hang: r[1], loai_hang: r[2], nhom_hang: r[3], brand_id: r[4],
        gia_ban: r[5], gia_von: r[6], qty_on_hand: r[7], image_url: r[8], active: r[9]
      });
    });
    done.push("Admin_Products: 4 sản phẩm mẫu (SVG001 là dịch vụ, không trừ kho)");
  } else {
    skipped.push("Admin_Products (đã có dữ liệu)");
  }

  const report = { ok: true, seeded: done, skipped: skipped };
  Logger.log(JSON.stringify(report, null, 2));
  return report;
}

/* ═══ CHẠY HÀM NÀY CUỐI CÙNG ═══
   Kiểm tra spreadsheet đã đủ điều kiện chạy app chưa. In ra thứ còn thiếu. */
function verifySetup() {
  const rep = schemaReport();
  const issues = rep.issues;

  const problems = [];
  if (issues.missingSheets.length) {
    problems.push("Thiếu sheet: " + issues.missingSheets.join(", "));
  }
  for (const sheetName in issues.missingHeaders) {
    const fields = issues.missingHeaders[sheetName].map(function (m) { return m.field; });
    problems.push(sheetName + " thiếu cột: " + fields.join(", "));
  }

  // Không có nhân viên active thì không ai đăng nhập được
  let staffCount = 0;
  try { staffCount = (getStaffPublic().staff || []).length; } catch (e) { problems.push("Không đọc được Admin_Staff: " + e.message); }
  if (staffCount === 0) problems.push("Admin_Staff chưa có nhân viên nào active → không đăng nhập được");

  let productCount = 0;
  try { productCount = getProducts().count; } catch (e) { problems.push("Không đọc được Admin_Products: " + e.message); }

  const out = problems.length
    ? { ok: false, problems: problems }
    : { ok: true, msg: "Spreadsheet sẵn sàng.", staffActive: staffCount, products: productCount,
        next: "Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone → copy URL /exec vào assets/js/config.js" };

  Logger.log(JSON.stringify(out, null, 2));
  return out;
}

// ===== helper nội bộ =====

// Sheet coi là "trống" khi chỉ có dòng header
function _isEmptySheet_(name) {
  const ws = SS.getSheetByName(name);
  if (!ws) return false;
  return ws.getLastRow() <= 1;
}

function _removeDefaultEmptySheet_() {
  const defaults = ["Sheet1", "Trang tính1", "Trang tinh1"];
  for (const n of defaults) {
    const ws = SS.getSheetByName(n);
    // Chỉ xoá khi thật sự trống và không phải sheet duy nhất còn lại
    if (ws && ws.getLastRow() === 0 && SS.getSheets().length > 1) {
      try { SS.deleteSheet(ws); } catch (_) {}
    }
  }
}
