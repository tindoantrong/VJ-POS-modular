// ═══════════════════════════════════════════════════════════
// VJ-POS Apps Script — 99_debug.gs
// Chạy tay trong editor Apps Script khi cần chẩn đoán. Không endpoint nào gọi tới.
// ═══════════════════════════════════════════════════════════

// Chạy hàm này rồi mở View → Logs để xem sheet nào thiếu, cột nào thiếu
function testSchema() {
  Logger.log(JSON.stringify(schemaReport(), null, 2));
}

// Kiểm tra nhanh mã đơn kế tiếp mà không ghi gì
function testNextOrderId() {
  Logger.log(_nextOrderId_());
}
