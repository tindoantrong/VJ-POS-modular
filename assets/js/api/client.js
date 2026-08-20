/* VJ·POS — lớp gọi Apps Script. Mọi request ra ngoài đều đi qua đây.
   LƯU Ý CORS: KHÔNG set header Content-Type khi POST. Apps Script không trả header
   preflight, thêm Content-Type là request bị chặn ngay. Body cứ gửi JSON.stringify thô. */
(function () {
  window.VJ = window.VJ || {};
  var cfg = VJ.config;

  // Apps Script khi lỗi hay trả về trang HTML thay vì JSON → biến thành thông báo đọc được
  function parseJsonOrThrow(text) {
    try {
      return JSON.parse(text);
    } catch (_) {
      if (/<!DOCTYPE|<html/i.test(text)) {
        throw new Error("API trả về HTML thay vì JSON — kiểm tra lại quyền truy cập bản deploy (Anyone).");
      }
      throw new Error("API trả về dữ liệu không hợp lệ: " + String(text).slice(0, 120));
    }
  }

  function fetchWithTimeout(url, options) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var opts = Object.assign({ redirect: "follow" }, options || {});
    if (ctrl) opts.signal = ctrl.signal;

    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, cfg.REQUEST_TIMEOUT_MS);

    return fetch(url, opts)
      .then(function (r) { return r.text(); })
      .then(function (text) { clearTimeout(timer); return parseJsonOrThrow(text); })
      .catch(function (err) {
        clearTimeout(timer);
        if (err && err.name === "AbortError") throw new Error("Hết thời gian chờ — mạng chậm hoặc Apps Script quá tải.");
        throw err;
      });
  }

  // GET có retry vì đọc dữ liệu lặp lại thì vô hại
  function get(action, retriesLeft) {
    var n = (retriesLeft === undefined) ? cfg.GET_RETRIES : retriesLeft;
    var url = cfg.API + "?action=" + action + "&t=" + Date.now();
    return fetchWithTimeout(url).catch(function (err) {
      if (n > 0) return get(action, n - 1);
      throw err;
    });
  }

  // POST KHÔNG retry: gọi lại submit_order lần 2 sẽ tạo đơn trùng và trừ kho 2 lần
  function post(body) {
    return fetchWithTimeout(cfg.API, { method: "POST", body: JSON.stringify(body) });
  }

  /* Đăng nhập bằng POST để PIN không nằm trong URL (query string bị ghi vào execution log
     của Apps Script). Nếu backend chưa deploy bản mới (chưa nhận action=login qua POST)
     thì tự lùi về GET như cũ, nên deploy frontend/backend lệch nhau vẫn không gãy. */
  function login(pin) {
    return post({ action: "login", pin: pin }).then(function (res) {
      if (res && res.ok === false && /unknown action/i.test(String(res.error || ""))) {
        return get("login&pin=" + encodeURIComponent(pin));
      }
      return res;
    }).catch(function () {
      return get("login&pin=" + encodeURIComponent(pin));
    });
  }

  VJ.api = { get: get, post: post, login: login };
})();
