// ═══════════════════════════════════════════════════════════
// VJ-POS Apps Script — 10_http.gs
// Định tuyến request + đóng gói response. Nguyên tắc: LUÔN trả JSON, kể cả khi
// exception, để frontend không "mù lỗi" khi Apps Script trả trang HTML.
//
// ⚠️ CORS: frontend POST mà KHÔNG set Content-Type để tránh preflight. Apps Script
// không trả header preflight, thêm Content-Type vào là request bị chặn ngay.
// ═══════════════════════════════════════════════════════════

function doGet(e) {
  const reqId = _reqId_();
  const params = (e && e.parameter) ? e.parameter : {};
  const action = String(params.action || "").toLowerCase().trim();

  return _handle_(reqId, "GET", action, () => {
    switch (action) {
      case "ping": return _ok_({ msg: "pong", version: API_VERSION });
      case "schema": return schemaReport();
      case "products": return getProducts();
      case "staff": return getStaffPublic();
      case "artists": return getArtists();
      case "orders": return getOrders();
      // PUBLIC — bảng giá cho trang bán hàng khách lẻ (shop.html). Không cần PIN vì
      // giá bán vốn là thông tin công khai, in trên bao bì.
      case "shop_products": return getShopProducts();
      // Giữ lại để tương thích ngược. Frontend mới đăng nhập bằng POST (PIN không lọt vào URL).
      case "login": return login(params.pin || "");
      default:
        return _ok_({ msg: "VJ-POS API", version: API_VERSION, actions: ["ping","schema","products","staff","artists","orders","shop_products","login"] });
    }
  });
}

function doPost(e) {
  const reqId = _reqId_();

  const raw = (e && e.postData && typeof e.postData.contents === "string") ? e.postData.contents : "";
  const body = _tryParseJson_(raw);
  if (!body.ok) return _json_(_err_("Invalid JSON", { detail: body.error, rawHead: raw.slice(0, 120) }, reqId));

  const action = String(body.value.action || "").toLowerCase().trim();

  // Không cần PIN cho ping/schema
  if (action === "ping") return _json_(_ok_({ msg: "pong", version: API_VERSION }, reqId));
  if (action === "schema") return _json_(schemaReport(reqId));

  /* ═══ ENDPOINT PUBLIC — KHÁCH ĐẶT HÀNG, KHÔNG CẦN PIN ═══
     Đây là lối ghi duy nhất không qua xác thực, nên submitCustomerOrder phải tự lo:
     tính lại giá từ SHOP_CATALOG (không tin client), giới hạn tần suất, honeypot.
     Nó chỉ ghi vào Shop_Orders — KHÔNG đụng Orders, KHÔNG trừ kho.
     Thêm action public mới ở đây phải cân nhắc rất kỹ. */
  if (action === "customer_order") {
    return _handle_(reqId, "POST", action, function () { return submitCustomerOrder(body.value); });
  }

  // Mọi lệnh ghi còn lại đều phải có PIN hợp lệ
  const pin = String(body.value.pin || "").trim();
  const auth = _validatePin_(pin);
  if (!auth) return _json_(_err_("Invalid PIN", null, reqId));

  // Gắn thông tin nhân viên đã xác thực vào body — handler KHÔNG được tin staffId do client gửi
  body.value.staffId = auth.id;
  body.value.staffName = auth.name;
  body.value.staffRole = auth.role;

  return _handle_(reqId, "POST", action, () => {
    switch (action) {
      case "login": return login(pin);            // PIN đã đúng ở trên; ở đây chỉ lấy thêm hoa hồng
      case "submit_order": return submitOrder(body.value);
      case "add_payment": return addPayment(body.value);
      case "update_stock": return updateStock(body.value);
      case "void_order": return voidOrder(body.value);
      case "bulk_import": return bulkImport(body.value);
      default:
        return _err_("Unknown action: " + action, null, reqId);
    }
  });
}

// ===== Response helpers =====
function _json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _ok_(data, reqId) {
  const out = data || {};
  out.ok = true;
  out.version = API_VERSION;
  out.ts = _nowStr_();
  if (reqId) out.reqId = reqId;
  return out;
}

function _err_(message, extra, reqId) {
  const out = { ok: false, error: String(message || "Error"), version: API_VERSION, ts: _nowStr_() };
  if (reqId) out.reqId = reqId;
  if (extra) out.extra = extra;
  return out;
}

function _handle_(reqId, method, action, fn) {
  try {
    const res = fn();
    // handler trả object chưa có cờ ok → bọc thành ok
    if (res && typeof res === "object" && res.ok === undefined) return _json_(_ok_(res, reqId));
    if (res && typeof res === "object" && res.reqId === undefined) res.reqId = reqId;
    return _json_(res);
  } catch (err) {
    return _json_(_err_(err && err.message ? err.message : String(err), { method, action }, reqId));
  }
}

function _reqId_() {
  try { return Utilities.getUuid(); } catch (_) { return "REQ-" + new Date().getTime(); }
}

function _nowStr_() {
  return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd HH:mm:ss");
}

function _tryParseJson_(s) {
  try {
    if (!s) return { ok: false, error: "Empty body" };
    return { ok: true, value: JSON.parse(s) };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

function _asNum_(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : (def || 0);
}

function _isFalse_(v) {
  return v === false || v === 0 || String(v).toUpperCase() === "FALSE";
}
