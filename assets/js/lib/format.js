/* VJ·POS — định dạng số và ngày giờ theo múi giờ Việt Nam. Hàm thuần, không phụ thuộc React. */
(function () {
  window.VJ = window.VJ || {};

  // 1234567 → "1.234.567"
  var fmt = function (n) {
    return new Intl.NumberFormat("vi-VN").format(Math.round(n));
  };

  // 1234567 → "1.2M" · 45000 → "45K" — dùng cho chỗ hẹp (thẻ hoa hồng, giá dòng giỏ hàng)
  var fmtK = function (n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return Math.round(n / 1e3) + "K";
    return fmt(n);
  };

  // "2026-02-24 14:30:05" theo giờ VN, khớp định dạng _nowStr_ bên Apps Script
  var vnNow = function () {
    return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
  };

  var vnDate = function () {
    return vnNow().split(" ")[0];
  };

  VJ.format = { fmt: fmt, fmtK: fmtK, vnNow: vnNow, vnDate: vnDate };
})();
