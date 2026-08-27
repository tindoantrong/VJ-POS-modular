// ═══════════════════════════════════════════════════════════
// VJ-POS Apps Script — 80_shop.gs
// Trang bán gạo cho khách lẻ (index.html). Endpoint PUBLIC, KHÔNG cần PIN.
//
// KHÁC BIỆT QUAN TRỌNG so với POS:
// - Đơn khách đặt ghi vào Shop_Orders, KHÔNG ghi vào Orders của POS.
//   Đơn POS là doanh thu đã chốt (trừ kho, tính hoa hồng). Đơn web mới chỉ là
//   đơn CHỜ XÁC NHẬN — khách có thể bỏ bom. Nhân viên gọi xác nhận rồi mới lên đơn POS.
// - KHÔNG trừ tồn kho. Trừ kho khi nhân viên chốt đơn thật.
// - KHÔNG tin giá client gửi lên. Endpoint public thì ai cũng sửa được payload,
//   nên server luôn tính lại tiền từ SHOP_CATALOG bên dưới.
// ═══════════════════════════════════════════════════════════

/* ═══ BẢNG GIÁ — NGUỒN SỰ THẬT DUY NHẤT VỀ TIỀN ═══
   Đổi giá ở đây rồi Deploy lại là xong, không cần sửa frontend.
   Phần trình bày (ảnh, slogan, mô tả) nằm ở assets/js/shop/products.js —
   cố ý tách ra vì nội dung marketing không nên nằm trong code backend. */
const SHOP_CATALOG = {
  "ST25": {
    name: "Gạo ST25",
    variants: {
      "5kg":  { label: "Túi 5kg",  price: 185000 },
      "10kg": { label: "Túi 10kg", price: 355000 },
    },
  },
  "ST500": {
    name: "Gạo ST500",
    variants: {
      "5kg":  { label: "Túi 5kg",  price: 145000 },
      "10kg": { label: "Túi 10kg", price: 275000 },
    },
  },
};

// Phí ship và ngưỡng miễn phí
const SHOP_SHIPPING_FEE = 30000;
const SHOP_FREE_SHIP_FROM = 500000;

// Giới hạn chống spam
const SHOP_MAX_QTY_PER_LINE = 20;      // 1 dòng tối đa 20 túi
const SHOP_MAX_LINES = 10;             // 1 đơn tối đa 10 dòng
const SHOP_MAX_ORDERS_PER_PHONE = 3;   // 1 số điện thoại tối đa 3 đơn / giờ
const SHOP_MAX_ORDERS_GLOBAL = 60;     // toàn hệ thống tối đa 60 đơn / giờ

// ===== GET: bảng giá cho trang bán hàng =====
function getShopProducts() {
  const items = [];
  for (const pid in SHOP_CATALOG) {
    const p = SHOP_CATALOG[pid];
    const variants = [];
    for (const vid in p.variants) {
      variants.push({ id: vid, label: p.variants[vid].label, price: p.variants[vid].price });
    }
    items.push({ id: pid, name: p.name, variants: variants });
  }
  return {
    ok: true,
    products: items,
    shippingFee: SHOP_SHIPPING_FEE,
    freeShipFrom: SHOP_FREE_SHIP_FROM,
    version: API_VERSION,
    ts: _nowStr_()
  };
}

// ===== POST: khách đặt hàng (KHÔNG cần PIN) =====
function submitCustomerOrder(body) {
  // Honeypot: input ẩn mà người thật không bao giờ điền. Bot điền vào thì giả vờ
  // thành công để nó không thử lại, nhưng không ghi gì cả.
  if (String(body.website || "").trim() !== "") {
    return { ok: true, orderId: "DH-000000", spam: true, version: API_VERSION, ts: _nowStr_() };
  }

  const name = String(body.customerName || "").trim();
  const phone = String(body.customerPhone || "").replace(/[^0-9+]/g, "");
  const address = String(body.customerAddress || "").trim();
  const note = String(body.note || "").trim().slice(0, 500);
  const payment = ["cod", "transfer"].indexOf(String(body.paymentMethod || "")) >= 0
    ? String(body.paymentMethod) : "cod";

  if (name.length < 2) return _err_("Vui lòng nhập họ tên");
  if (!/^(0|\+84)[0-9]{8,10}$/.test(phone)) return _err_("Số điện thoại không hợp lệ");
  if (address.length < 8) return _err_("Vui lòng nhập địa chỉ giao hàng đầy đủ");

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (!rawItems.length) return _err_("Giỏ hàng đang trống");
  if (rawItems.length > SHOP_MAX_LINES) return _err_("Đơn quá nhiều loại, vui lòng liên hệ để đặt sỉ");

  // ── Tính lại toàn bộ tiền từ SHOP_CATALOG, bỏ qua mọi số client gửi ──
  const items = [];
  let itemsTotal = 0;

  for (const raw of rawItems) {
    const pid = String(raw.productId || "").trim();
    const vid = String(raw.variantId || "").trim();
    const qty = Math.floor(_asNum_(raw.qty, 0));

    const product = SHOP_CATALOG[pid];
    if (!product) return _err_("Sản phẩm không tồn tại: " + pid);

    const variant = product.variants[vid];
    if (!variant) return _err_("Quy cách không tồn tại: " + pid + " / " + vid);

    if (qty < 1) return _err_("Số lượng không hợp lệ cho " + product.name);
    if (qty > SHOP_MAX_QTY_PER_LINE) {
      return _err_("Tối đa " + SHOP_MAX_QTY_PER_LINE + " túi mỗi loại. Đặt số lượng lớn xin liên hệ trực tiếp.");
    }

    const lineTotal = variant.price * qty;   // giá SERVER, không phải giá client gửi
    itemsTotal += lineTotal;

    items.push({
      productId: pid,
      productName: product.name,
      variant: variant.label,
      variantId: vid,
      qty: qty,
      unitPrice: variant.price,
      lineTotal: lineTotal
    });
  }

  const shippingFee = itemsTotal >= SHOP_FREE_SHIP_FROM ? 0 : SHOP_SHIPPING_FEE;
  const grandTotal = itemsTotal + shippingFee;

  // ── Chống spam trước khi ghi ──
  const guard = _shopRateLimit_(phone);
  if (!guard.ok) return _err_(guard.error);

  // ── Ghi đơn ──
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const wsO = _sheet_("Shop_Orders");
    const wsI = _sheet_("Shop_Order_Items");

    _tryUnprotect_("Shop_Orders");
    _tryUnprotect_("Shop_Order_Items");

    const orderId = _nextShopOrderId_();
    const now = _nowStr_();

    _appendByHeader_(wsO, {
      shop_order_id: orderId,
      created_at: now,
      customer_name: name,
      customer_phone: _asText_(phone),   // giữ số 0 đầu, xem _asText_ trong 20_sheets.gs
      customer_address: address,
      note: note,
      payment_method: payment,
      items_total: itemsTotal,
      shipping_fee: shippingFee,
      grand_total: grandTotal,
      status: SHOP_STATUSES[0],   // "NEW" — vòng đời khai báo ở 00_schema.gs
      handled_by: "",
      handled_at: "",
    });

    for (let k = 0; k < items.length; k++) {
      const it = items[k];
      _appendByHeader_(wsI, {
        shop_order_item_id: orderId + "-" + String(k + 1).padStart(2, "0"),
        shop_order_id: orderId,
        product_id: it.productId,
        product_name: it.productName,
        variant: it.variant,
        qty: it.qty,
        unit_price: it.unitPrice,
        line_total: it.lineTotal,
      });
    }

    _tryReprotect_("Shop_Orders");
    _tryReprotect_("Shop_Order_Items");

    _shopRateLimitCommit_(phone);

    return {
      ok: true,
      orderId: orderId,
      itemsTotal: itemsTotal,
      shippingFee: shippingFee,
      grandTotal: grandTotal,     // client hiển thị lại số này, KHÔNG dùng số nó tự tính
      version: API_VERSION,
      ts: _nowStr_()
    };
  } finally {
    lock.releaseLock();
  }
}

/* Giới hạn tần suất. Apps Script không cho biết IP người gọi nên chặn theo số điện thoại,
   kèm trần toàn hệ thống để một kẻ đổi số liên tục không làm ngập sheet. */
function _shopRateLimit_(phone) {
  try {
    const cache = CacheService.getScriptCache();

    const perPhone = _asNum_(cache.get("shop_rl_" + phone), 0);
    if (perPhone >= SHOP_MAX_ORDERS_PER_PHONE) {
      return { ok: false, error: "Số điện thoại này vừa đặt nhiều đơn. Vui lòng gọi hotline để được hỗ trợ." };
    }

    const global = _asNum_(cache.get("shop_rl_global"), 0);
    if (global >= SHOP_MAX_ORDERS_GLOBAL) {
      return { ok: false, error: "Hệ thống đang quá tải đơn. Vui lòng thử lại sau ít phút." };
    }

    return { ok: true };
  } catch (_) {
    return { ok: true };   // cache lỗi thì cho qua, không chặn khách thật
  }
}

function _shopRateLimitCommit_(phone) {
  try {
    const cache = CacheService.getScriptCache();
    const k = "shop_rl_" + phone;
    cache.put(k, String(_asNum_(cache.get(k), 0) + 1), 3600);
    cache.put("shop_rl_global", String(_asNum_(cache.get("shop_rl_global"), 0) + 1), 3600);
  } catch (_) {}
}

// Mã đơn web dạng DH-0001, tách hẳn khỏi dãy VJ-xxxx của POS để không nhầm
function _nextShopOrderId_() {
  const ws = _sheet_("Shop_Orders");
  const lastRow = ws.getLastRow();
  if (lastRow <= 1) return "DH-0001";

  const h = _hmap_(ws);
  const c = _col_(h, ["shop_order_id", "order_id", "id"]);
  const col = (c >= 0) ? c + 1 : 1;

  const vals = ws.getRange(2, col, lastRow - 1, 1).getValues();
  let max = 0;
  for (let i = 0; i < vals.length; i++) {
    const n = parseInt(String(vals[i][0] || "").replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return "DH-" + String(max + 1).padStart(4, "0");
}
