// ═══════════════════════════════════════════════════════════
// VJ-POS Apps Script — 70_stock.gs
// Trừ kho khi bán, chỉnh kho thủ công, nhập kho hàng loạt, và ghi nhật ký mọi biến động.
// Nguyên tắc: MỌI thay đổi tồn kho đều phải đi kèm 1 dòng trong Admin_Stock_Log.
// ═══════════════════════════════════════════════════════════

// ===== Trừ kho khi bán (gọi trong lock của submitOrder) =====
function _decrementStock_(items, orderId, changedBy) {
  const ws = _sheet_("Admin_Products");
  const data = ws.getDataRange().getValues();

  const h = _hmap_(ws);
  const cPid = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.product_id);
  const cLoai = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.loai_hang);
  const cQty = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.qty);

  const fPid = 0, fLoai = 2, fQty = 7;

  const pidIndex = (cPid >= 0) ? cPid : fPid;
  const loaiIndex = (cLoai >= 0) ? cLoai : fLoai;
  const qtyCol = (cQty >= 0) ? (cQty + 1) : (fQty + 1);

  const rowMap = {};
  for (let i = 1; i < data.length; i++) {
    const pid = String(data[i][pidIndex] || "").trim();
    if (pid) rowMap[pid] = i + 1;
  }

  for (const item of items) {
    const pid = String(item.productId || "").trim();
    const qty = _asNum_(item.qty, 0);
    if (!pid || qty <= 0) continue;

    const sheetRow = rowMap[pid];
    if (!sheetRow) continue;   // hàng đặt riêng, không có trong kho

    const loaiHang = String(data[sheetRow - 1][loaiIndex] || "");
    if (_isService_(loaiHang)) continue;

    const qtyBefore = _asNum_(ws.getRange(sheetRow, qtyCol).getValue(), 0);
    const qtyAfter = Math.max(0, qtyBefore - qty);
    ws.getRange(sheetRow, qtyCol).setValue(qtyAfter);

    _logStock_(pid, "SALE", -qty, qtyBefore, qtyAfter, orderId, changedBy || "SYSTEM");
  }
}

// ===== POST: chỉnh kho thủ công 1 sản phẩm =====
function updateStock(body) {
  const productId = String(body.productId || "").trim();
  const qtyChange = _asNum_(body.qtyChange, 0);
  if (!productId) return _err_("productId required");

  const ws = _sheet_("Admin_Products");
  _tryUnprotect_("Admin_Products");
  _tryUnprotect_("Admin_Stock_Log");

  const h = _hmap_(ws);
  const cQty = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.qty);
  const qtyCol = (cQty >= 0) ? (cQty + 1) : 8;   // dự phòng v2.0: cột H

  const row = _findRowByHeader_(ws, SCHEMA.Admin_Products.requiredAnyOf.product_id, productId);
  if (row > 0) {
    const qtyBefore = _asNum_(ws.getRange(row, qtyCol).getValue(), 0);
    const qtyAfter = qtyBefore + qtyChange;
    ws.getRange(row, qtyCol).setValue(qtyAfter);

    _logStock_(productId, body.changeType || "ADJUSTMENT", qtyChange, qtyBefore, qtyAfter, body.reference || "", body.staffId || "MANUAL");
    return { ok: true, productId: productId, qtyBefore: qtyBefore, qtyAfter: qtyAfter, version: API_VERSION, ts: _nowStr_() };
  }
  return _err_("Product not found: " + productId);
}

/* ===== POST: nhập kho hàng loạt (chỉ manager) =====
   Sản phẩm đã có → cộng thêm tồn, cập nhật giá nếu truyền.
   Sản phẩm chưa có → tạo dòng mới. */
function bulkImport(body) {
  const role = String(body.staffRole || "").toLowerCase().trim();
  if (role !== "manager") return _err_("Only managers can import stock");

  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return _err_("No items to import");

  const ws = _sheet_("Admin_Products");
  _tryUnprotect_("Admin_Products");
  _tryUnprotect_("Admin_Stock_Log");

  const h = _hmap_(ws);
  const cPid = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.product_id);
  const cTen = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.ten_hang);
  const cLoai = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.loai_hang);
  const cNhom = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.nhom_hang);
  const cBrand = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.brand);
  const cPrice = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.price);
  const cCost = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.cost);
  const cQty = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.qty);
  const cImg = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.img);
  const cActive = _col_(h, SCHEMA.Admin_Products.requiredAnyOf.active);

  const fPid = 0, fTen = 1, fLoai = 2, fNhom = 3, fBrand = 4, fPrice = 5, fCost = 6, fQty = 7, fImg = 8, fActive = 9;

  const data = ws.getDataRange().getValues();
  const existingMap = {};
  for (let i = 1; i < data.length; i++) {
    const pid = String((cPid >= 0) ? data[i][cPid] : data[i][fPid] || "");
    if (pid) existingMap[pid] = i + 1;
  }

  let updated = 0, added = 0;
  const errors = [];

  for (const it of items) {
    const pid = String(it.product_id || it.productId || "").trim();
    if (!pid) { errors.push("Missing product_id"); continue; }

    const qtyToAdd = _asNum_(it.qty_add ?? it.qty_to_add ?? it.qtyAdd ?? 0, 0);
    const price = (it.price !== undefined && it.price !== null) ? _asNum_(it.price, 0) : null;
    const cost = (it.cost !== undefined && it.cost !== null) ? _asNum_(it.cost, 0) : null;

    const rowNum = existingMap[pid];

    if (rowNum) {
      if (qtyToAdd !== 0) {
        const qtyBefore = _asNum_(ws.getRange(rowNum, (cQty >= 0 ? cQty + 1 : fQty + 1)).getValue(), 0);
        const qtyAfter = qtyBefore + qtyToAdd;
        ws.getRange(rowNum, (cQty >= 0 ? cQty + 1 : fQty + 1)).setValue(qtyAfter);
        _logStock_(pid, "IMPORT", qtyToAdd, qtyBefore, qtyAfter, "BULK_IMPORT", body.staffId || "SYSTEM");
        updated++;
      }
      if (price !== null) ws.getRange(rowNum, (cPrice >= 0 ? cPrice + 1 : fPrice + 1)).setValue(price);
      if (cost !== null) ws.getRange(rowNum, (cCost >= 0 ? cCost + 1 : fCost + 1)).setValue(cost);
    } else {
      const name = String(it.name || "").trim();
      if (!name) { errors.push(pid + ": missing name"); continue; }

      // getMaxColumns (không phải getLastColumn) để mảng row phủ hết chiều rộng thật của sheet
      const maxCols = ws.getMaxColumns();
      const row = new Array(maxCols).fill("");

      /* SỬA LỖI: bản cũ ghi ten_hang = "Hàng hóa" (chuỗi cố định) và nhom_hang = name.
         Trong khi getProducts lấy tên hiển thị = ten_hang || nhom_hang → MỌI sản phẩm nhập
         mới đều hiện tên là "Hàng hóa" trên màn hình bán hàng.
         Đúng phải là: ten_hang = tên sản phẩm, loai_hang/nhom_hang = phân loại. */
      const loai = String(it.type || it.loai_hang || "").trim();
      const nhom = String(it.nhom_hang || it.cat || loai || "").trim();

      if (cPid >= 0) row[cPid] = pid; else row[fPid] = pid;
      if (cTen >= 0) row[cTen] = name; else row[fTen] = name;
      if (cLoai >= 0) row[cLoai] = loai; else row[fLoai] = loai;
      if (cNhom >= 0) row[cNhom] = nhom; else row[fNhom] = nhom;
      if (cBrand >= 0) row[cBrand] = it.brand || ""; else row[fBrand] = it.brand || "";
      if (cPrice >= 0) row[cPrice] = _asNum_(it.price, 0); else row[fPrice] = _asNum_(it.price, 0);
      if (cCost >= 0) row[cCost] = _asNum_(it.cost, 0); else row[fCost] = _asNum_(it.cost, 0);
      if (cQty >= 0) row[cQty] = qtyToAdd; else row[fQty] = qtyToAdd;
      if (cImg >= 0) row[cImg] = it.image_url || ""; else row[fImg] = it.image_url || "";
      if (cActive >= 0) row[cActive] = true; else row[fActive] = true;

      ws.appendRow(row);
      _logStock_(pid, "NEW_PRODUCT", qtyToAdd, 0, qtyToAdd, "BULK_IMPORT", body.staffId || "SYSTEM");
      added++;
    }
  }

  return { ok: true, updated: updated, added: added, errors: errors, version: API_VERSION, ts: _nowStr_() };
}

// ===== Nhật ký kho. Thiếu sheet log thì bỏ qua, không làm fail nghiệp vụ bán hàng =====
function _logStock_(productId, changeType, qtyChange, qtyBefore, qtyAfter, reference, changedBy) {
  const ws = SS.getSheetByName("Admin_Stock_Log");
  if (!ws) return;

  _tryUnprotect_("Admin_Stock_Log");

  const logId = "LOG-" + new Date().getTime() + "-" + Math.random().toString(36).substr(2, 4);
  const now = _nowStr_();
  ws.appendRow([logId, now, productId, changeType, qtyChange, qtyBefore, qtyAfter, reference, changedBy]);

  _tryReprotect_("Admin_Stock_Log");
}
