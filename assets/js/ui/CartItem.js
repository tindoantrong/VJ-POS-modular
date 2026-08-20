/* VJ·POS — một dòng hàng trong giỏ: sửa số lượng, sửa đơn giá, giảm giá riêng dòng. */
(function () {
  window.VJ = window.VJ || {};
  VJ.ui = VJ.ui || {};
  var e = React.createElement;
  var useState = React.useState, useEffect = React.useEffect;
  var fmt = VJ.format.fmt, fmtK = VJ.format.fmtK;
  var catIcon = VJ.catalog.catIcon, brandColor = VJ.catalog.brandColor;

  function CartItem(props) {
    var item = props.item, onUpdate = props.onUpdate, onRemove = props.onRemove;
    var showDiscState = useState(item.discount > 0), showDisc = showDiscState[0], setShowDisc = showDiscState[1];
    var discTypeState = useState(item.discountPct > 0 ? "pct" : "fixed"), discType = discTypeState[0], setDiscType = discTypeState[1];
    var discValState = useState(item.discountPct > 0 ? item.discountPct : (item.discount || 0)), discVal = discValState[0], setDiscVal = discValState[1];

    var lineBase = item.qty * item.unitPrice;
    var discAmt = discType === "pct" ? Math.round(lineBase * (discVal / 100)) : discVal;

    // Đẩy số tiền giảm đã tính về giỏ hàng ở cấp trên. Chỉ ghi khi thực sự lệch để không lặp vô hạn.
    useEffect(function () {
      if (discAmt !== item.discount) {
        onUpdate(item.cartId, "discount", discAmt);
        onUpdate(item.cartId, "discountPct", discType === "pct" ? discVal : 0);
      }
    }, [discAmt, discType, discVal]);

    return e("div", { className: "ci" },
      e("div", { className: "ci-top" },
        e("div", { className: "ci-img" }, catIcon(item.type)),
        e("div", { className: "ci-info" },
          e("div", { className: "ci-name" }, item.name),
          e("div", { className: "ci-brand", style: { color: brandColor(item.brand) } }, item.brand + " · " + item.id),
          e("div", { className: "ci-ctrl" },
            e("button", { className: "qbtn", onClick: function () { onUpdate(item.cartId, "qty", Math.max(1, item.qty - 1)); } }, "−"),
            e("span", { className: "qnum" }, item.qty),
            e("button", { className: "qbtn", onClick: function () { onUpdate(item.cartId, "qty", item.qty + 1); } }, "+"),
            e("span", { style: { color: "var(--t3)", fontSize: 12 } }, "×"),
            e("input", { className: "cie", type: "number", value: item.unitPrice, onChange: function (ev) { onUpdate(item.cartId, "unitPrice", parseInt(ev.target.value) || 0); } })
          )
        ),
        e("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 } },
          e("span", { className: "ci-rm", onClick: function () { onRemove(item.cartId); } }, "×"),
          e("div", { className: "ci-pr" }, fmtK(lineBase - discAmt))
        )
      ),
      e("div", { className: "ci-expand" },
        !showDisc
          ? e("button", { className: "ci-exp-toggle", onClick: function () { setShowDisc(true); } }, "🏷 Add discount ›")
          : e("div", null,
            e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 } },
              e("span", { style: { fontSize: 12, color: "var(--t2)", fontWeight: 500 } }, "Item Discount"),
              discAmt > 0 ? e("span", { style: { fontSize: 12, color: "var(--red)", fontFamily: "'Space Mono',monospace" } }, "−" + fmt(discAmt) + "đ") : null
            ),
            e(VJ.ui.DiscountInput, {
              value: discVal, type: discType,
              onValueChange: setDiscVal, onTypeChange: setDiscType,
              baseAmount: lineBase, compact: true
            })
          )
      )
    );
  }

  VJ.ui.CartItem = CartItem;
})();
