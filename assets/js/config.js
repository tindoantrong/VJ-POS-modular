/* VJ·POS — cấu hình toàn app. File này nạp ĐẦU TIÊN, mọi file khác đọc qua window.VJ.

   API: URL Web App của Apps Script gắn với Google Spreadsheet dùng làm database.
        ĐỔI URL NÀY = TRỎ APP SANG MỘT SPREADSHEET KHÁC HOÀN TOÀN.
        Muốn dùng spreadsheet của riêng mình: làm theo docs/SETUP.md rồi dán URL mới vào đây.
        ⚠️ URL này trình duyệt tải về được nên coi như công khai — xem mục bảo mật ở SETUP.md.

   BUILD_VERSION: mỗi lần deploy nhớ bump, và sửa luôn ?v= trong index.html và pos.html để iPhone không dùng cache cũ. */
window.VJ = window.VJ || {};

VJ.config = {
  API: "https://script.google.com/macros/s/AKfycbzx5LYyA3e_PxkRBV7f_nPGo5xhBQzudfosNOanl1LITD8zHFG9LZXUwsvki395p45O/exec",
  CARD_FEE_RATE: 0.03,
  BUILD_VERSION: "2026-02-24-modular",
  // Số lần thử lại khi mạng chập chờn (chỉ áp dụng cho GET — POST không retry để tránh ghi trùng đơn)
  GET_RETRIES: 2,
  REQUEST_TIMEOUT_MS: 30000
};
