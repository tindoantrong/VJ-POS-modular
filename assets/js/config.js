/* VJ·POS — cấu hình toàn app. File này nạp ĐẦU TIÊN, mọi file khác đọc qua window.VJ.
   ĐỔI URL API Ở ĐÂY, không hardcode chỗ nào khác.
   BUILD_VERSION: mỗi lần deploy nhớ bump, và sửa luôn ?v= trong index.html để iPhone không dùng cache cũ. */
window.VJ = window.VJ || {};

VJ.config = {
  API: "https://script.google.com/macros/s/AKfycbw4WEQSVDoIg1ZPBvDuVqMrMLwursif0x36artUHMlE57NPs0Omk_AKevQ7gZjyPgaO8Q/exec",
  CARD_FEE_RATE: 0.03,
  BUILD_VERSION: "2026-02-24-modular",
  // Số lần thử lại khi mạng chập chờn (chỉ áp dụng cho GET — POST không retry để tránh ghi trùng đơn)
  GET_RETRIES: 2,
  REQUEST_TIMEOUT_MS: 30000
};
