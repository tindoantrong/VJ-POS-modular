/* VJ·POS — TOÀN BỘ công thức tiền bạc của app nằm ở file này. Hàm thuần, không đụng React.
   Trước đây công thức phân bổ giảm giá bill xuống từng dòng bị viết 2 lần (1 lần để hiện
   hoa hồng trên màn hình, 1 lần khi gửi đơn lên sheet) — sửa 1 chỗ quên chỗ kia là lệch tiền.
   Giờ cả hai đều gọi allocateLine().

   Thứ tự tính:
     subtotal        = Σ qty × unitPrice
     − itemDiscTotal = Σ giảm giá từng dòng
     = afterItemDisc
     − billDiscAmt   (nếu % thì tính trên afterItemDisc; nếu tiền cố định thì không vượt afterItemDisc)
     = netCommBase   ← ĐÂY là gốc tính hoa hồng, phí thẻ và ship KHÔNG được tính hoa hồng
     + cardFeeAmt (3% netCommBase) + shipAmt
     = grandTotal */
(function () {
  window.VJ = window.VJ || {};

  /* Phân bổ giảm giá bill xuống 1 dòng hàng theo tỉ trọng doanh thu của dòng đó.
     Trả về lineNet (trước giảm bill), lineAfterBill (sau giảm bill) và hoa hồng của dòng. */
  function allocateLine(item, afterItemDisc, billDiscAmt) {
    var lineNet = item.qty * item.unitPrice - (item.discount || 0);
    var share = afterItemDisc > 0 ? lineNet / afterItemDisc : 0;
    var lineAfterBill = Math.max(0, lineNet - billDiscAmt * share);
    return {
      lineNet: lineNet,
      lineAfterBill: lineAfterBill,
      commFull: Math.round(lineAfterBill * (item.rate || 0))
    };
  }

  /* opts: { billDiscVal, billDiscType: "pct"|"fixed", shippingFee, cardFeeOn } */
  function calcTotals(cart, opts) {
    var billDiscVal = opts.billDiscVal || 0;
    var billDiscType = opts.billDiscType || "pct";
    var shippingFee = opts.shippingFee || 0;

    var subtotal = cart.reduce(function (s, i) { return s + i.qty * i.unitPrice; }, 0);
    var itemDiscTotal = cart.reduce(function (s, i) { return s + (i.discount || 0); }, 0);
    var afterItemDisc = subtotal - itemDiscTotal;

    var billDiscAmt = billDiscType === "pct"
      ? Math.round(afterItemDisc * (billDiscVal / 100))
      : Math.min(billDiscVal, afterItemDisc);

    var netCommBase = Math.max(0, afterItemDisc - billDiscAmt);
    var cardFeeAmt = opts.cardFeeOn ? Math.round(netCommBase * VJ.config.CARD_FEE_RATE) : 0;
    var grandTotal = netCommBase + cardFeeAmt + shippingFee;

    var commFull = cart.reduce(function (s, i) {
      return s + allocateLine(i, afterItemDisc, billDiscAmt).commFull;
    }, 0);

    return {
      subtotal: subtotal,
      itemDiscTotal: itemDiscTotal,
      afterItemDisc: afterItemDisc,
      billDiscAmt: billDiscAmt,
      billDiscPct: billDiscType === "pct" ? billDiscVal : 0,
      netCommBase: netCommBase,
      cardFeeAmt: cardFeeAmt,
      shipAmt: shippingFee,
      grandTotal: grandTotal,
      commFull: commFull
    };
  }

  /* Dựng mảng items gửi lên Apps Script — dùng chung allocateLine với calcTotals
     nên hoa hồng hiện trên màn hình luôn khớp hoa hồng ghi vào sheet. */
  function buildOrderItems(cart, totals) {
    return cart.map(function (i) {
      var a = allocateLine(i, totals.afterItemDisc, totals.billDiscAmt);
      return {
        productId: i.id,
        name: i.name,
        brand: i.brand,
        cat: i.type,
        qty: i.qty,
        unitPrice: i.unitPrice,
        discount: i.discount || 0,
        lineNet: Math.round(a.lineAfterBill),
        rate: i.rate || 0,
        commFull: a.commFull
      };
    });
  }

  VJ.totals = { allocateLine: allocateLine, calcTotals: calcTotals, buildOrderItems: buildOrderItems };
})();
