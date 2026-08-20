// ═══════════════════════════════════════════════════════════
// VJ-POS Apps Script — 60_payments.gs
// Ghi nhận thanh toán và cập nhật collected_total / payment_status của đơn.
// ═══════════════════════════════════════════════════════════

/* Thêm 1 lần thu tiền cho đơn.
   LockService là BẮT BUỘC ở đây: cập nhật collected_total là đọc-cộng-ghi. Không khoá thì
   hai nhân viên cùng thu tiền một đơn (hoặc bấm nút 2 lần) sẽ đọc cùng một giá trị cũ và
   ghi đè lên nhau, làm mất hẳn một khoản thu trong khi dòng Payments vẫn có đủ 2 bản ghi. */
function addPayment(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const wsP = _sheet_("Payments");
    const wsO = _sheet_("Orders");

    const orderId = String(body.orderId || "").trim();
    if (!orderId) return _err_("orderId required");

    const amountTotal = _asNum_(body.amount, 0);
    const amountForComm = _asNum_(body.amountForComm, 0);

    // Đơn phải tồn tại thì mới ghi thanh toán — trước đây gõ nhầm orderId vẫn tạo được
    // dòng Payments mồ côi, không đơn nào nhận, tiền coi như biến mất khỏi báo cáo.
    const row = _findRowByHeader_(wsO, ["order_id","orderid","id"], orderId);
    if (row < 0) return _err_("Order not found: " + orderId);

    _tryUnprotect_("Payments");
    _tryUnprotect_("Orders");

    const paymentId = "PAY-" + new Date().getTime();
    const now = _nowStr_();

    _appendByHeader_(wsP, {
      payment_id: paymentId,
      order_id: orderId,
      payment_date: now,
      method: body.method || "",
      amount_total: amountTotal,
      amount_for_commission: amountForComm,
      note: body.note || "",
    });

    // Cộng dồn số đã thu và cập nhật trạng thái thanh toán
    const h = _hmap_(wsO);
    const cCollected = _col_(h, ["collected_total"]);
    const cCollectedComm = _col_(h, ["collected_for_commission"]);
    const cGrand = _col_(h, ["grand_total","total"]);
    const cPayStatus = _col_(h, ["payment_status"]);

    const prevCollected = (cCollected >= 0) ? _asNum_(wsO.getRange(row, cCollected + 1).getValue(), 0) : 0;
    const prevCollectedComm = (cCollectedComm >= 0) ? _asNum_(wsO.getRange(row, cCollectedComm + 1).getValue(), 0) : 0;
    const grand = (cGrand >= 0) ? _asNum_(wsO.getRange(row, cGrand + 1).getValue(), 0) : 0;

    const newCollected = prevCollected + amountTotal;
    const newCollectedComm = prevCollectedComm + amountForComm;

    if (cCollected >= 0) wsO.getRange(row, cCollected + 1).setValue(newCollected);
    if (cCollectedComm >= 0) wsO.getRange(row, cCollectedComm + 1).setValue(newCollectedComm);

    if (cPayStatus >= 0) {
      const status = (grand > 0 && newCollected >= grand) ? "PAID" : (newCollected > 0 ? "PARTIAL" : "UNPAID");
      wsO.getRange(row, cPayStatus + 1).setValue(status);
    }

    _tryReprotect_("Payments");
    _tryReprotect_("Orders");

    return { ok: true, paymentId, collectedTotal: newCollected, version: API_VERSION, ts: _nowStr_() };
  } finally {
    lock.releaseLock();
  }
}
