// ═══════════════════════════════════════════════════════════
// VJ-POS Apps Script — 20_sheets.gs
// Đọc/ghi Google Sheets THEO TÊN CỘT chứ không theo vị trí cột. Nhờ vậy chèn/đổi
// chỗ cột trong sheet không làm sai dữ liệu. Mọi hàm nghiệp vụ đều dùng nhóm helper này.
// ═══════════════════════════════════════════════════════════

function _sheet_(name) {
  const ws = SS.getSheetByName(name);
  if (!ws) throw new Error("Missing sheet: " + name);
  return ws;
}

function _headers_(ws) {
  const lastCol = Math.max(1, ws.getLastColumn());
  const row = ws.getRange(1, 1, 1, lastCol).getValues()[0] || [];
  return row.map(h => _normalizeHeader_(h));
}

/* Chuẩn hoá tên cột để so khớp dễ hơn: bỏ dấu tiếng Việt, đ→d, thường hoá,
   khoảng trắng/gạch ngang → gạch dưới. "Tên Hàng" và "ten_hang" ra cùng một khoá. */
function _normalizeHeader_(v) {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return "";
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[đ]/g, "d")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// { tên_cột_đã_chuẩn_hoá: chỉ_số_cột_0_based }
function _hmap_(ws) {
  const hs = _headers_(ws);
  const map = {};
  for (let i = 0; i < hs.length; i++) if (hs[i]) map[hs[i]] = i;
  return map;
}

// Tìm chỉ số cột theo danh sách tên chấp nhận được. Trả -1 nếu không có cột nào khớp.
function _col_(hmap, names) {
  for (const n of names) {
    const key = _normalizeHeader_(n);
    if (key && hmap[key] !== undefined) return hmap[key];
  }
  return -1;
}

// Ghi 1 dòng mới, khớp key của obj với tên cột. Key không có cột tương ứng sẽ bị bỏ qua.
function _appendByHeader_(ws, obj) {
  const map = _hmap_(ws);
  const row = new Array(ws.getLastColumn()).fill("");
  for (const k in obj) {
    const key = _normalizeHeader_(k);
    if (map[key] !== undefined) row[map[key]] = obj[k];
  }
  ws.appendRow(row);
}

// Tìm số dòng (1-based) có giá trị `value` ở cột tên `headerVariants`. Trả -1 nếu không thấy.
function _findRowByHeader_(ws, headerVariants, value) {
  const h = _hmap_(ws);
  const c = _col_(h, headerVariants);
  if (c < 0) return -1;
  const lastRow = ws.getLastRow();
  if (lastRow < 2) return -1;
  const colVals = ws.getRange(2, c + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < colVals.length; i++) {
    if (String(colVals[i][0]) === String(value)) return i + 2;
  }
  return -1;
}

function _fmtDate_(d) {
  if (!d) return "";
  if (d instanceof Date) return Utilities.formatDate(d, TZ, "yyyy-MM-dd HH:mm:ss");
  return String(d);
}

// ===== Khoá sheet (best-effort, không được làm fail nghiệp vụ) =====
function _tryUnprotect_(name) {
  try {
    const ws = SS.getSheetByName(name);
    if (!ws) return;
    const protections = ws.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    for (const p of protections) p.remove();
  } catch (_) {}
}

function _tryReprotect_(name) {
  try {
    const ws = SS.getSheetByName(name);
    if (!ws) return;
    const protection = ws.protect().setDescription("VJ-POS locked: " + name);
    protection.setWarningOnly(true);
  } catch (_) {}
}
