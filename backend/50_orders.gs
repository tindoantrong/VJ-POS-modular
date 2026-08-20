// ═══════════════════════════════════════════════════════════
// VJ-POS Apps Script — 50_orders.gs
// Đọc đơn, tạo đơn (có kiểm tra tồn kho), huỷ đơn (hoàn kho).
// ═══════════════════════════════════════════════════════════

// ===== GET: Orders — chỉ lấy 100 đơn gần nhất cho nhẹ =====
function getOrders() {
  const wsO = _sheet_("Orders");
  const wsI = _sheet_("Order_Items");
  const wsP = _sheet_("Payments");

  const hO = _hmap_(wsO), hI = _hmap_(wsI), hP = _hmap_(wsP);

  const lastRowO = wsO.getLastRow();
  const lastColO = Math.max(1, wsO.getLastColumn());
  if (lastRowO < 2) return { ok: true, count: 0, orders: [], version: API_VERSION, ts: _nowStr_() };

  const startRowO = Math.max(2, lastRowO - 99);
  const oData = wsO.getRange(startRowO, 1, lastRowO - startRowO + 1, lastColO).getValues();

  const cOid = _col_(hO, SCHEMA.Orders.requiredAnyOf.order_id);
  const cDate = _col_(hO, SCHEMA.Orders.requiredAnyOf.date);
  const cStaff = _col_(hO, SCHEMA.Orders.requiredAnyOf.staff_id);
  const cCName = _col_(hO, SCHEMA.Orders.requiredAnyOf.customer_name);
  const cCPhone = _col_(hO, SCHEMA.Orders.requiredAnyOf.customer_phone);
  const cSubtotal = _col_(hO, SCHEMA.Orders.requiredAnyOf.subtotal);
  const cItemDisc = _col_(hO, SCHEMA.Orders.requiredAnyOf.item_disc_total);
  const cBillDiscAmt = _col_(hO, SCHEMA.Orders.requiredAnyOf.bill_disc_amt);
  const cBillDiscPct = _col_(hO, SCHEMA.Orders.requiredAnyOf.bill_disc_pct);
  const cNetComm = _col_(hO, SCHEMA.Orders.requiredAnyOf.net_comm_base);
  const cCardFee = _col_(hO, SCHEMA.Orders.requiredAnyOf.card_fee_amt);
  const cShip = _col_(hO, SCHEMA.Orders.requiredAnyOf.ship_amt);
  const cGrand = _col_(hO, SCHEMA.Orders.requiredAnyOf.grand_total);
  const cNotes = _col_(hO, SCHEMA.Orders.requiredAnyOf.notes);
  const cStatus = _col_(hO, SCHEMA.Orders.requiredAnyOf.status);

  const orders = [];
  for (let i = 0; i < oData.length; i++) {
    const row = oData[i];

    const oid = (cOid >= 0) ? row[cOid] : row[0];
    if (!oid) continue;

    const status = String((cStatus >= 0) ? row[cStatus] : (row[14] || "ACTIVE"));
    orders.push({
      orderId: String(oid),
      date: _fmtDate_((cDate >= 0) ? row[cDate] : row[1]),
      staffId: String((cStaff >= 0) ? row[cStaff] : (row[2] || "")),
      customerName: String((cCName >= 0) ? row[cCName] : (row[3] || "")),
      customerPhone: String((cCPhone >= 0) ? row[cCPhone] : (row[4] || "")),
      subtotal: _asNum_((cSubtotal >= 0) ? row[cSubtotal] : row[5], 0),
      itemDiscTotal: _asNum_((cItemDisc >= 0) ? row[cItemDisc] : row[6], 0),
      billDiscAmt: _asNum_((cBillDiscAmt >= 0) ? row[cBillDiscAmt] : row[7], 0),
      billDiscPct: _asNum_((cBillDiscPct >= 0) ? row[cBillDiscPct] : row[8], 0),
      netCommBase: _asNum_((cNetComm >= 0) ? row[cNetComm] : row[9], 0),
      cardFeeAmt: _asNum_((cCardFee >= 0) ? row[cCardFee] : row[10], 0),
      shipAmt: _asNum_((cShip >= 0) ? row[cShip] : row[11], 0),
      grandTotal: _asNum_((cGrand >= 0) ? row[cGrand] : row[12], 0),
      notes: String((cNotes >= 0) ? row[cNotes] : (row[13] || "")),
      status: status || "ACTIVE",
      items: [],
      payments: [],
    });
  }

  const orderMap = {};
  orders.forEach(o => { orderMap[o.orderId] = o; });

  // TODO hiệu năng: Order_Items và Payments hiện đọc TOÀN BỘ sheet mỗi lần gọi, trong khi
  // Orders đã giới hạn 100 dòng. Sheet lớn dần thì phải đọc ngược từ dưới lên và dừng sớm.
  const iData = wsI.getDataRange().getValues();
  const cIOrder = _col_(hI, SCHEMA.Order_Items.requiredAnyOf.order_id);
  const cIProd = _col_(hI, SCHEMA.Order_Items.requiredAnyOf.product_id);
  const cIName = _col_(hI, SCHEMA.Order_Items.requiredAnyOf.name);
  const cIBrand = _col_(hI, SCHEMA.Order_Items.requiredAnyOf.brand);
  const cICat = _col_(hI, SCHEMA.Order_Items.requiredAnyOf.cat);
  const cIQty = _col_(hI, SCHEMA.Order_Items.requiredAnyOf.qty);
  const cIUnit = _col_(hI, SCHEMA.Order_Items.requiredAnyOf.unit_price);
  const cIDisc = _col_(hI, SCHEMA.Order_Items.requiredAnyOf.discount);
  const cINet = _col_(hI, SCHEMA.Order_Items.requiredAnyOf.line_net);
  const cIStaff = _col_(hI, SCHEMA.Order_Items.requiredAnyOf.staff_id);
  const cIRate = _col_(hI, SCHEMA.Order_Items.requiredAnyOf.rate);
  const cIComm = _col_(hI, SCHEMA.Order_Items.requiredAnyOf.comm_full);

  for (let i = 1; i < iData.length; i++) {
    const row = iData[i];
    const oid = String((cIOrder >= 0) ? row[cIOrder] : (row[1] || ""));
    const o = orderMap[oid];
    if (!o) continue;

    o.items.push({
      productId: String((cIProd >= 0) ? row[cIProd] : (row[2] || "")),
      name: String((cIName >= 0) ? row[cIName] : (row[3] || "")),
      brand: String((cIBrand >= 0) ? row[cIBrand] : (row[4] || "")),
      cat: String((cICat >= 0) ? row[cICat] : (row[5] || "")),
      qty: _asNum_((cIQty >= 0) ? row[cIQty] : row[6], 0),
      unitPrice: _asNum_((cIUnit >= 0) ? row[cIUnit] : row[7], 0),
      discount: _asNum_((cIDisc >= 0) ? row[cIDisc] : row[8], 0),
      lineNet: _asNum_((cINet >= 0) ? row[cINet] : row[9], 0),
      staffId: String((cIStaff >= 0) ? row[cIStaff] : (row[10] || "")),
      rate: _asNum_((cIRate >= 0) ? row[cIRate] : row[11], 0),
      commFull: _asNum_((cIComm >= 0) ? row[cIComm] : row[12], 0),
    });
  }

  const pData = wsP.getDataRange().getValues();
  const cPOrder = _col_(hP, SCHEMA.Payments.requiredAnyOf.order_id);
  const cPDate = _col_(hP, SCHEMA.Payments.requiredAnyOf.date);
  const cPMethod = _col_(hP, SCHEMA.Payments.requiredAnyOf.method);
  const cPAmount = _col_(hP, SCHEMA.Payments.requiredAnyOf.amount);
  const cPNote = _col_(hP, SCHEMA.Payments.requiredAnyOf.note);
  const cPPid = _col_(hP, SCHEMA.Payments.requiredAnyOf.payment_id);

  for (let i = 1; i < pData.length; i++) {
    const row = pData[i];
    const oid = String((cPOrder >= 0) ? row[cPOrder] : (row[1] || ""));
    const o = orderMap[oid];
    if (!o) continue;

    o.payments.push({
      paymentId: String((cPPid >= 0) ? row[cPPid] : (row[0] || "")),
      date: _fmtDate_((cPDate >= 0) ? row[cPDate] : row[2]),
      method: String((cPMethod >= 0) ? row[cPMethod] : (row[3] || "")),
      amount: _asNum_((cPAmount >= 0) ? row[cPAmount] : row[4], 0),
      note: String((cPNote >= 0) ? row[cPNote] : (row[6] || "")),
    });
  }

  // Mới nhất lên đầu
  return { ok: true, count: orders.length, orders: orders.reverse(), version: API_VERSION, ts: _nowStr_() };
}

// ═══ POST: Submit Order ═══
// LockService bọc cả hàm: chống 2 nhân viên bấm Submit cùng lúc sinh trùng orderId
// và chống trừ kho chồng nhau.
function submitOrder(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const wsO = _sheet_("Orders");
    const wsI = _sheet_("Order_Items");
    const wsProd = _sheet_("Admin_Products");

    _tryUnprotect_("Orders");
    _tryUnprotect_("Order_Items");
    _tryUnprotect_("Admin_Products");
    _tryUnprotect_("Admin_Stock_Log");

    const orderId = body.orderId || _nextOrderId_();
    const now = _nowStr_();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return _err_("No items in order");

    // ── KIỂM TRA TỒN KHO TRƯỚC KHI GHI BẤT CỨ THỨ GÌ ──
    // Thiếu hàng thì trả lỗi ngay, không ghi nửa vời rồi phải đi dọn.
    const prodData = wsProd.getDataRange().getValues();
    const hProd = _hmap_(wsProd);
    const cPid = _col_(hProd, SCHEMA.Admin_Products.requiredAnyOf.product_id);
    const cQty = _col_(hProd, SCHEMA.Admin_Products.requiredAnyOf.qty);
    const cLoai = _col_(hProd, SCHEMA.Admin_Products.requiredAnyOf.loai_hang);

    const fPid = 0, fQty = 7, fLoai = 2;   // dự phòng khi sheet không có dòng header
    const pidIndex = (cPid >= 0) ? cPid : fPid;
    const qtyIndex = (cQty >= 0) ? cQty : fQty;
    const loaiIndex = (cLoai >= 0) ? cLoai : fLoai;

    const prodMap = {};
    for (let i = 1; i < prodData.length; i++) {
      const pid = String(prodData[i][pidIndex] || "").trim();
      if (!pid) continue;
      prodMap[pid] = {
        row: i + 1,
        qty: _asNum_(prodData[i][qtyIndex], 0),
        loaiHang: String(prodData[i][loaiIndex] || "")
      };
    }

    const errors = [];
    for (const it of items) {
      const pid = String(it.productId || "").trim();
      const qty = _asNum_(it.qty, 0);
      if (!pid || qty <= 0) continue;
      const prod = prodMap[pid];
      if (!prod) {
        // Hàng đặt riêng (frontend gửi cat "ORDER", id dạng CUSTOM-n) không nằm trong kho
        const cat = String(it.cat || it.type || "").trim().toUpperCase();
        const isCustom = (cat === "ORDER") || /^CUSTOM-/.test(pid) || (pid === "CUSTOM");
        if (isCustom) continue;
        errors.push("Product not found: " + pid);
        continue;
      }
      if (_isService_(prod.loaiHang)) continue;   // dịch vụ không trừ tồn
      if (prod.qty < qty) {
        errors.push("Insufficient stock for " + pid + ": available " + prod.qty + ", requested " + qty);
      }
    }
    if (errors.length > 0) {
      return _err_("Stock check failed", { errors });
    }

    const baseCostTotal = _asNum_(body.subtotal, 0);
    const discountTotal = _asNum_(body.itemDiscTotal, 0) + _asNum_(body.billDiscAmt, 0);
    const netCommBase = _asNum_(body.netCommBase, 0);
    const extraFeeTotal = _asNum_(body.cardFeeAmt, 0) + _asNum_(body.shipAmt, 0);
    const grandTotal = _asNum_(body.grandTotal, 0);

    _appendByHeader_(wsO, {
      order_id: orderId,
      order_date: now,
      staff_id: body.staffId || "",
      customer_name: body.customerName || "",
      customer_phone: body.customerPhone || "",
      base_cost_total: baseCostTotal,
      discount_total: discountTotal,
      net_commission_base: netCommBase,
      extra_fee_total: extraFeeTotal,
      grand_total: grandTotal,
      collected_total: 0,
      collected_for_commission: 0,
      payment_status: "UNPAID",
      commission_paid_total: 0,
      status: "ACTIVE",
    });

    for (let k = 0; k < items.length; k++) {
      const it = items[k] || {};
      const qty = _asNum_(it.qty, 0);
      const unit = _asNum_(it.unitPrice, 0);
      const lineBase = qty * unit;
      const disc = _asNum_(it.discount, 0);
      const lineNet = (it.lineNet !== undefined && it.lineNet !== null)
        ? _asNum_(it.lineNet, 0)
        : Math.max(0, lineBase - disc);

      _appendByHeader_(wsI, {
        order_item_id: orderId + "-" + String(k + 1).padStart(2, "0"),
        order_id: orderId,
        product_id: it.productId || "",
        product_name: it.name || "",
        brand_id: it.brand || "",
        cat: it.cat || it.category || "",
        nhom_hang: it.cat || it.category || "",
        qty: qty,
        unit_price: unit,
        line_base_cost: lineBase,
        line_discount_amount: disc,
        line_net_commission_base: lineNet,
        staff_id: body.staffId || "",
        staff_commission_rate: _asNum_(it.rate, 0),
        commission_full: _asNum_(it.commFull, 0),
        commission_paid: 0,
      });
    }

    _decrementStock_(items, orderId, body.staffId || "SYSTEM");

    _tryReprotect_("Orders");
    _tryReprotect_("Order_Items");

    return { ok: true, orderId, itemCount: items.length, version: API_VERSION, ts: _nowStr_() };
  } finally {
    lock.releaseLock();
  }
}

// ═══ POST: Void Order — chỉ manager, hoàn kho lại ═══
function voidOrder(body) {
  const role = String(body.staffRole || "").toLowerCase().trim();
  if (role !== "manager") return _err_("Only managers can void orders");

  const orderId = String(body.orderId || "").trim();
  if (!orderId) return _err_("orderId required");

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const wsO = _sheet_("Orders");
    const wsI = _sheet_("Order_Items");
    const wsProd = _sheet_("Admin_Products");

    _tryUnprotect_("Orders");
    _tryUnprotect_("Order_Items");
    _tryUnprotect_("Admin_Products");
    _tryUnprotect_("Admin_Stock_Log");

    const rowO = _findRowByHeader_(wsO, ["order_id","orderid","id"], orderId);
    if (rowO < 0) return _err_("Order not found");

    const hO = _hmap_(wsO);
    const cStatus = _col_(hO, ["status"]);
    if (cStatus >= 0) {
      const cur = String(wsO.getRange(rowO, cStatus + 1).getValue() || "");
      if (cur === "VOID") return { ok: true, orderId, status: "VOID", already: true, version: API_VERSION, ts: _nowStr_() };
      wsO.getRange(rowO, cStatus + 1).setValue("VOID");
    }

    const prodData = wsProd.getDataRange().getValues();
    const hProd = _hmap_(wsProd);
    const cProdId = _col_(hProd, SCHEMA.Admin_Products.requiredAnyOf.product_id);
    const cLoai = _col_(hProd, SCHEMA.Admin_Products.requiredAnyOf.loai_hang);
    const cQty = _col_(hProd, SCHEMA.Admin_Products.requiredAnyOf.qty);

    const fProdId = 0, fLoai = 2, fQty = 7;

    const prodMap = {};
    for (let i = 1; i < prodData.length; i++) {
      const pid = String((cProdId >= 0) ? prodData[i][cProdId] : prodData[i][fProdId] || "");
      if (pid) {
        prodMap[pid] = {
          row: i + 1,
          loaiHang: String((cLoai >= 0) ? prodData[i][cLoai] : prodData[i][fLoai] || ""),
          qtyCol: (cQty >= 0) ? cQty : fQty
        };
      }
    }

    // Hoàn kho theo Order_Items.
    // BẮT BUỘC có fallback index: bản cũ dùng thẳng row[cIOrder], khi sheet thiếu header thì
    // cIOrder = -1 → row[-1] = undefined → không khớp dòng nào → đơn bị huỷ mà KHÔNG hoàn kho,
    // lại không báo lỗi gì. Đây là kiểu hỏng im lặng nguy hiểm nhất với tồn kho.
    const iData = wsI.getDataRange().getValues();
    const hI = _hmap_(wsI);
    const cIOrder = _col_(hI, ["order_id","orderid"]);
    const cIProd = _col_(hI, ["product_id","productid"]);
    const cIQty = _col_(hI, ["qty","quantity"]);
    const iOrderIdx = (cIOrder >= 0) ? cIOrder : 1;
    const iProdIdx = (cIProd >= 0) ? cIProd : 2;
    const iQtyIdx = (cIQty >= 0) ? cIQty : 6;

    let restored = 0;
    for (let i = 1; i < iData.length; i++) {
      const row = iData[i];
      if (String(row[iOrderIdx]) !== orderId) continue;

      const pid = String(row[iProdIdx] || "");
      const qty = _asNum_(row[iQtyIdx], 0);
      const prod = prodMap[pid];
      if (!prod || qty <= 0) continue;

      if (_isService_(prod.loaiHang)) continue;

      const qtyBefore = _asNum_(wsProd.getRange(prod.row, prod.qtyCol + 1).getValue(), 0);
      const qtyAfter = qtyBefore + qty;
      wsProd.getRange(prod.row, prod.qtyCol + 1).setValue(qtyAfter);
      restored++;

      _logStock_(pid, "VOID_RESTORE", qty, qtyBefore, qtyAfter, orderId, body.staffId || "SYSTEM");
    }

    _tryReprotect_("Orders");
    return { ok: true, orderId, status: "VOID", restoredLines: restored, version: API_VERSION, ts: _nowStr_() };
  } finally {
    lock.releaseLock();
  }
}

/* Sinh mã đơn kế tiếp. Quét TOÀN BỘ cột order_id lấy số lớn nhất, thay vì chỉ đọc dòng cuối
   cùng của cột A như bản cũ — cách cũ sai ngay khi sheet bị sort lại hoặc cột order_id không
   nằm ở cột A, và sinh ra mã trùng. Hàm này chỉ được gọi bên trong lock của submitOrder. */
function _nextOrderId_() {
  const ws = _sheet_("Orders");
  const lastRow = ws.getLastRow();
  if (lastRow <= 1) return "VJ-0001";

  const h = _hmap_(ws);
  const c = _col_(h, SCHEMA.Orders.requiredAnyOf.order_id);
  const col = (c >= 0) ? c + 1 : 1;

  const vals = ws.getRange(2, col, lastRow - 1, 1).getValues();
  let max = 0;
  for (let i = 0; i < vals.length; i++) {
    const n = parseInt(String(vals[i][0] || "").replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return "VJ-" + String(max + 1).padStart(4, "0");
}
