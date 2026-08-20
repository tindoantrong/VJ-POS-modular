/* VJ·POS — tab Orders: danh sách đơn và màn chi tiết 1 đơn (thanh toán / huỷ đơn).
   getStatus() là nguồn duy nhất quyết định nhãn paid / partial / unpaid / void. */
(function () {
  window.VJ = window.VJ || {};
  VJ.screens = VJ.screens || {};
  var e = React.createElement;
  var fmt = VJ.format.fmt;
  var catIcon = VJ.catalog.catIcon, brandColor = VJ.catalog.brandColor;

  function collectedOf(o) {
    return (o.payments || []).reduce(function (s, p) { return s + p.amount; }, 0);
  }

  function getStatus(o) {
    if (o.status === "VOID") return "void";
    var c = collectedOf(o);
    return c >= o.grandTotal ? "paid" : c > 0 ? "partial" : "unpaid";
  }

  function list(p) {
    var activeOrders = p.orders.filter(function (o) { return o.status !== "VOID"; });

    return e("div", { className: "fin", style: { padding: 16 } },
      e("div", { className: "stit" }, "Orders (" + activeOrders.length + ")"),
      !p.orders.length
        ? e("div", { className: "empty" }, e("div", { className: "empty-i" }, "📋"), e("div", { className: "empty-t" }, "No orders yet."))
        : p.orders.map(function (o) {
          return e("div", {
            key: o.orderId,
            className: "oc" + (o.status === "VOID" ? " void" : ""),
            onClick: function () { p.setSelOrder(o); }
          },
            e("div", { className: "oh" },
              e("span", { className: "oid" }, o.orderId),
              e("span", { className: "ost st-" + getStatus(o) }, getStatus(o))),
            e("div", { style: { fontSize: 13, color: "var(--t)" } }, "👤 " + (o.staffName || o.staffId) + " → " + (o.customerName || "Walk-in")),
            e("div", { style: { fontSize: 12, color: "var(--t3)" } }, typeof o.date === "string" ? o.date.split(" ")[0] : String(o.date)),
            e("div", { className: "otot" }, fmt(o.grandTotal) + "đ"),
            e("div", { className: "oiprev" }, (o.items || []).map(function (i) { return i.name; }).join(", "))
          );
        })
    );
  }

  function detail(p) {
    var o = p.selOrder;

    return e("div", { className: "fin", style: { padding: 16 } },
      e("button", {
        style: { background: "none", border: "none", color: "var(--gold)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 12 },
        onClick: function () { p.setSelOrder(null); }
      }, "← Back"),

      e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } },
        e("span", { className: "oid", style: { fontSize: 20 } }, o.orderId),
        e("span", { className: "ost st-" + getStatus(o) }, getStatus(o))),

      e("div", { className: "stit" }, "Items"),
      (o.items || []).map(function (item, idx) {
        return e("div", { key: idx, className: "ci" }, e("div", { className: "ci-top" },
          e("div", { className: "ci-img" }, catIcon(item.cat || item.type)),
          e("div", { className: "ci-info" },
            e("div", { className: "ci-name" }, item.name),
            e("div", { className: "ci-brand", style: { color: brandColor(item.brand) } }, item.brand + " · " + item.qty + "× " + fmt(item.unitPrice) + "đ")),
          e("div", { className: "ci-pr" }, fmt(item.lineNet || (item.qty * item.unitPrice - (item.discount || 0))) + "đ")
        ));
      }),

      e("div", { className: "sum", style: { marginTop: 8 } },
        e("div", { className: "sr" }, e("span", { className: "sl" }, "Subtotal"), e("span", { className: "sv" }, fmt(o.subtotal) + "đ")),
        o.billDiscAmt > 0 ? e("div", { className: "sr" }, e("span", { className: "sl" }, "Discount"), e("span", { className: "sv", style: { color: "var(--red)" } }, "−" + fmt(o.billDiscAmt) + "đ")) : null,
        e("div", { className: "sr tot" }, e("span", null, "Grand Total"), e("span", { className: "sv g" }, fmt(o.grandTotal) + "đ")),
        e("div", { className: "sr", style: { paddingTop: 6 } }, e("span", { className: "sl" }, "Collected"), e("span", { className: "sv", style: { color: "var(--green)" } }, fmt(collectedOf(o)) + "đ"))
      ),

      e("div", { className: "stit", style: { marginTop: 16 } }, "Payments"),
      !(o.payments || []).length
        ? e("div", { style: { fontSize: 13, color: "var(--t3)", marginBottom: 12 } }, "No payments yet.")
        : (o.payments || []).map(function (pay, idx) {
          return e("div", { key: idx, className: "ci" }, e("div", { className: "ci-top" },
            e("div", { className: "ci-img", style: { fontSize: 18 } }, pay.method === "cash" ? "💵" : pay.method === "pos" ? "💳" : pay.method === "paypal" ? "🅿️" : "🏦"),
            e("div", { className: "ci-info" },
              e("div", { className: "ci-name" }, pay.method === "pos" ? "POS (Card)" : pay.method === "transfer" ? "Chuyển khoản" : pay.method.charAt(0).toUpperCase() + pay.method.slice(1)),
              e("div", { style: { fontSize: 11, color: "var(--t3)" } }, pay.date + (pay.note ? " · " + pay.note : ""))),
            e("div", { className: "ci-pr" }, fmt(pay.amount) + "đ")
          ));
        }),

      o.status !== "VOID" && getStatus(o) !== "paid"
        ? e("button", { className: "btn btn-gr", onClick: function () { p.setShowPay(o); } }, "💳 Record Payment") : null,
      p.isAdmin && o.status !== "VOID"
        ? e("button", { className: "btn btn-red", style: { marginTop: 8 }, onClick: function () { p.voidOrder(o.orderId); } }, "🚫 Void Order") : null
    );
  }

  VJ.screens.ordersList = list;
  VJ.screens.orderDetail = detail;
  VJ.screens.getOrderStatus = getStatus;
  VJ.screens.collectedOf = collectedOf;
})();
