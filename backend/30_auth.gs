// ═══════════════════════════════════════════════════════════
// VJ-POS Apps Script — 30_auth.gs
// Xác thực PIN + màn chào có hoa hồng tháng này / tháng trước.
// ═══════════════════════════════════════════════════════════

/* Trả {id, name, role} nếu PIN khớp một nhân viên đang active, ngược lại null.
   Nhân viên có active = FALSE/0 sẽ không đăng nhập được. */
function _validatePin_(pin) {
  if (!pin) return null;
  const ws = _sheet_("Admin_Staff");
  const h = _hmap_(ws);
  const data = ws.getDataRange().getValues();

  const cId = _col_(h, SCHEMA.Admin_Staff.requiredAnyOf.staff_id);
  const cName = _col_(h, SCHEMA.Admin_Staff.requiredAnyOf.name);
  const cRole = _col_(h, SCHEMA.Admin_Staff.requiredAnyOf.role);
  const cActive = _col_(h, SCHEMA.Admin_Staff.requiredAnyOf.active);
  const cPin = _col_(h, SCHEMA.Admin_Staff.requiredAnyOf.pin);

  // Bố cục dự phòng v2.0 nếu sheet không có dòng header: A=id, B=name, C=role, D=active, E=pin
  const fId = 0, fName = 1, fRole = 2, fActive = 3, fPin = 4;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const id = (cId >= 0) ? row[cId] : row[fId];
    if (!id) continue;

    const active = (cActive >= 0) ? row[cActive] : row[fActive];
    if (_isFalse_(active)) continue;

    const staffPin = String((cPin >= 0) ? row[cPin] : row[fPin] || "").trim();
    if (staffPin && staffPin === String(pin).trim()) {
      return {
        id: String(id),
        name: String((cName >= 0) ? row[cName] : (row[fName] || "")),
        role: String((cRole >= 0) ? row[cRole] : (row[fRole] || "")),
      };
    }
  }
  return null;
}

/* Đăng nhập: xác thực PIN rồi cộng hoa hồng của nhân viên đó trong tháng này và
   tháng trước (bỏ qua đơn VOID). Lỗi tính hoa hồng KHÔNG được chặn đăng nhập —
   nhân viên vẫn phải bán hàng được kể cả khi sheet hoa hồng có vấn đề. */
function login(pin) {
  const auth = _validatePin_(String(pin || "").trim());
  if (!auth) return _err_("Invalid PIN");

  var commission = { thisMonth: 0, lastMonth: 0 };
  try {
    const wsI = SS.getSheetByName("Order_Items");
    const wsO = SS.getSheetByName("Orders");
    if (wsI && wsO) {
      const hI = _hmap_(wsI);
      const hO = _hmap_(wsO);
      const iData = wsI.getDataRange().getValues();
      const oData = wsO.getDataRange().getValues();

      // Map order_id → {ngày, trạng thái} để lọc đơn VOID và biết đơn thuộc tháng nào
      const cOid = _col_(hO, SCHEMA.Orders.requiredAnyOf.order_id);
      const cDate = _col_(hO, SCHEMA.Orders.requiredAnyOf.date);
      const cStatus = _col_(hO, SCHEMA.Orders.requiredAnyOf.status);
      const orderInfo = {};
      for (var oi = 1; oi < oData.length; oi++) {
        var oid = String((cOid >= 0) ? oData[oi][cOid] : oData[oi][0] || "");
        var dateRaw = (cDate >= 0) ? oData[oi][cDate] : oData[oi][1];
        var status = String((cStatus >= 0) ? oData[oi][cStatus] : (oData[oi][14] || "ACTIVE"));
        if (oid) orderInfo[oid] = { date: dateRaw, status: status };
      }

      // So sánh tháng bằng chuỗi "yyyy-MM" đã format theo TZ Việt Nam để không lệch múi giờ
      var nowFormatted = Utilities.formatDate(new Date(), TZ, "yyyy-MM");
      var lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      var lastMonthFormatted = Utilities.formatDate(lastMonthDate, TZ, "yyyy-MM");

      const cIOrder = _col_(hI, SCHEMA.Order_Items.requiredAnyOf.order_id);
      const cIStaff = _col_(hI, SCHEMA.Order_Items.requiredAnyOf.staff_id);
      const cIComm = _col_(hI, SCHEMA.Order_Items.requiredAnyOf.comm_full);

      for (var ii = 1; ii < iData.length; ii++) {
        var row = iData[ii];
        var staffId = String((cIStaff >= 0) ? row[cIStaff] : (row[10] || ""));
        if (staffId !== auth.id) continue;

        var ordId = String((cIOrder >= 0) ? row[cIOrder] : (row[1] || ""));
        var info = orderInfo[ordId];
        if (!info || info.status === "VOID") continue;

        var commAmt = _asNum_((cIComm >= 0) ? row[cIComm] : row[12], 0);

        var orderYM = "";
        try {
          var dt = (info.date instanceof Date) ? info.date : new Date(info.date);
          if (!isNaN(dt.getTime())) {
            orderYM = Utilities.formatDate(dt, TZ, "yyyy-MM");
          }
        } catch(_) {}
        if (!orderYM) continue;

        if (orderYM === nowFormatted) {
          commission.thisMonth += commAmt;
        } else if (orderYM === lastMonthFormatted) {
          commission.lastMonth += commAmt;
        }
      }
      commission.thisMonth = Math.round(commission.thisMonth);
      commission.lastMonth = Math.round(commission.lastMonth);
    }
  } catch (ex) {
    commission.error = String(ex.message || ex);
  }

  return { ok: true, staff: auth, commission: commission, version: API_VERSION, ts: _nowStr_() };
}
