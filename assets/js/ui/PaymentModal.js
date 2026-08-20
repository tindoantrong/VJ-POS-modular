/* VJ·POS — bottom sheet ghi nhận thanh toán cho 1 đơn (thu được nhiều lần, trả góp từng phần). */
(function () {
  window.VJ = window.VJ || {};
  VJ.ui = VJ.ui || {};
  var e = React.createElement;
  var useState = React.useState;
  var fmt = VJ.format.fmt;

  var METHODS = [
    ["cash", "💵", "Cash"],
    ["pos", "💳", "POS (Card)"],
    ["transfer", "🏦", "Chuyển khoản"],
    ["paypal", "🅿️", "Paypal"]
  ];

  function PaymentModal(props) {
    var order = props.order;
    var methodState = useState("cash"), method = methodState[0], setMethod = methodState[1];

    var collected = order.payments ? order.payments.reduce(function (s, p) { return s + p.amount; }, 0) : 0;
    var remaining = order.grandTotal - collected;

    var amountState = useState(remaining), amount = amountState[0], setAmount = amountState[1];
    var noteState = useState(""), note = noteState[0], setNote = noteState[1];

    return e("div", { className: "ov", onClick: function (ev) { if (ev.target === ev.currentTarget) props.onClose(); } },
      e("div", { className: "sheet" },
        e("div", { className: "handle" }),
        e("div", { className: "mbody" },
          e("div", { style: { fontSize: 18, fontWeight: 600, marginBottom: 4 } }, "Record Payment"),
          e("div", { style: { fontSize: 13, color: "var(--t2)", marginBottom: 16 } },
            order.orderId + " · Remaining: ",
            e("span", { style: { color: "var(--gold)", fontFamily: "'Space Mono',monospace" } }, fmt(remaining) + "đ")
          ),
          e("div", { className: "ml" }, "Method"),
          e("div", { className: "pmgrid" },
            METHODS.map(function (m) {
              return e("button", { key: m[0], className: "pmb " + (method === m[0] ? "on" : ""), onClick: function () { setMethod(m[0]); } },
                e("span", { className: "pmi" }, m[1]), m[2]);
            })
          ),
          e("div", { className: "ml" }, "Amount"),
          e("input", { className: "mi", type: "number", value: amount, onChange: function (ev) { setAmount(parseInt(ev.target.value) || 0); }, style: { marginBottom: 12 } }),
          e("div", { className: "ml", style: { marginBottom: 4 } }, "Note"),
          e("textarea", { className: "nti", value: note, onChange: function (ev) { setNote(ev.target.value); }, placeholder: "Optional note..." }),
          e("button", {
            className: "btn btn-gr " + (props.submitting ? "btn-d" : ""),
            style: { marginTop: 16 },
            onClick: function () { props.onSubmit({ method: method, amount: amount, note: note }); }
          }, props.submitting ? "Saving..." : "Confirm · " + fmt(amount) + "đ"),
          e("button", { className: "btn btn-o", onClick: props.onClose }, "Cancel")
        )
      )
    );
  }

  VJ.ui.PaymentModal = PaymentModal;
})();
