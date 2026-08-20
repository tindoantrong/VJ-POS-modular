/* VJ·POS — ô nhập giảm giá, chuyển được giữa tiền cố định và phần trăm.
   Dùng ở 2 chỗ: giảm giá từng dòng (compact=true) và giảm giá cả bill. */
(function () {
  window.VJ = window.VJ || {};
  VJ.ui = VJ.ui || {};
  var e = React.createElement;
  var fmt = VJ.format.fmt;

  function DiscountInput(props) {
    var value = props.value, type = props.type, compact = props.compact;
    var computed = type === "pct" ? Math.round(props.baseAmount * (value / 100)) : value;

    return e("div", null,
      e("div", { className: "disc-type-row" },
        e("button", { className: "disc-type-btn " + (type === "fixed" ? "on" : ""), onClick: function () { props.onTypeChange("fixed"); } }, "đ Fixed"),
        e("button", { className: "disc-type-btn " + (type === "pct" ? "on" : ""), onClick: function () { props.onTypeChange("pct"); } }, "% Percent")
      ),
      e("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
        e("input", {
          className: compact ? "cie" : "fee-input",
          style: compact ? { width: "100%", fontSize: 13 } : {},
          type: "number",
          value: value || "",
          placeholder: "0",
          onChange: function (ev) { props.onValueChange(parseFloat(ev.target.value) || 0); }
        }),
        e("span", { style: { fontSize: 12, color: "var(--t3)", minWidth: 20 } }, type === "pct" ? "%" : "đ")
      ),
      type === "pct" && value > 0
        ? e("div", { style: { fontSize: 11, color: "var(--gold)", textAlign: "right", marginTop: 2, fontFamily: "'Space Mono',monospace" } }, "= " + fmt(computed) + "đ")
        : null
    );
  }

  VJ.ui.DiscountInput = DiscountInput;
})();
