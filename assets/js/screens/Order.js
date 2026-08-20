/* VJ·POS — tab Order: thanh draft, thông tin khách, giỏ hàng, phí & giảm giá, bảng tổng.
   Số liệu trong bảng tổng lấy từ VJ.totals.calcTotals — không tính lại ở đây. */
(function () {
  window.VJ = window.VJ || {};
  VJ.screens = VJ.screens || {};
  var e = React.createElement, Fragment = React.Fragment;
  var fmt = VJ.format.fmt;

  /* Thanh chuyển đơn nháp. Nhãn tab = tên khách nếu đã nhập, không thì "Draft N". */
  function draftsBar(p) {
    return e("div", { className: "drafts-bar" },
      p.drafts.map(function (d) {
        var itemCount = d.cart.length;
        var label = d.custName || ("Draft " + d.id);
        return e("button", {
          key: d.id,
          className: "draft-tab " + (d.id === p.activeDraftId ? "on" : ""),
          onClick: function () { p.switchDraft(d.id); }
        },
          e("span", null, label),
          itemCount > 0 ? e("span", { className: "draft-count" }, itemCount) : null,
          p.drafts.length > 1
            ? e("span", {
              className: "draft-close",
              onClick: function (ev) {
                ev.stopPropagation();
                if (d.cart.length > 0 && !confirm("Discard '" + label + "' (" + d.cart.length + " items)?")) return;
                p.removeDraft(d.id);
              }
            }, "×")
            : null
        );
      }),
      e("button", { className: "draft-add", onClick: p.addDraft, title: "New draft" }, "+")
    );
  }

  function linkBtn(label, onClick) {
    return e("button", {
      style: { background: "none", border: "none", color: "var(--gold)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
      onClick: onClick
    }, label);
  }

  function order(p) {
    var t = p.totals;

    return e("div", { className: "fin" }, e("div", { className: "osec" },
      draftsBar(p),
      e("div", { className: "stit" }, "Staff: " + p.auth.name),
      e("div", { className: "stit" }, "Customer"),
      e("div", { className: "crow" },
        e("input", { className: "cinp", placeholder: "Name", value: p.custName, onChange: function (ev) { p.setCustName(ev.target.value); } }),
        e("input", { className: "cinp", placeholder: "Phone", value: p.custPhone, onChange: function (ev) { p.setCustPhone(ev.target.value); }, style: { maxWidth: 140 } })
      ),
      e("div", { className: "stit", style: { marginTop: 8, display: "flex", justifyContent: "space-between" } },
        e("span", null, "Items (" + p.cart.length + ")"),
        e("div", { style: { display: "flex", gap: 8 } },
          linkBtn("✏️ Custom", function () { p.setShowCustom(true); }),
          linkBtn("+ Add", function () { p.setTab("products"); })
        )
      ),

      !p.cart.length
        ? e("div", { className: "empty", style: { padding: "40px 20px" } },
          e("div", { className: "empty-i" }, "🛒"),
          e("div", { className: "empty-t" }, "Tap a product to add it."))
        : p.cart.map(function (item) {
          return e(VJ.ui.CartItem, { key: item.cartId, item: item, onUpdate: p.updateCart, onRemove: p.removeCart });
        }),

      p.cart.length > 0 ? e(Fragment, null,
        e("div", { className: "stit", style: { marginTop: 16 } }, "Fees & Discounts"),
        e("div", { className: "ml", style: { marginBottom: 6 } }, "🏷 Bill Discount"),
        e(VJ.ui.DiscountInput, {
          value: p.billDiscVal, type: p.billDiscType,
          onValueChange: p.setBillDiscVal, onTypeChange: p.setBillDiscType,
          baseAmount: t.afterItemDisc
        }),
        e("div", { className: "fee-row", style: { marginTop: 12 } },
          e("span", { className: "fee-label" }, "📦 Shipping"),
          e("input", {
            className: "fee-input", type: "number", value: p.shippingFee || "", placeholder: "0",
            onChange: function (ev) { p.setShippingFee(parseInt(ev.target.value) || 0); }
          })
        ),
        e("div", { className: "fee-toggle", onClick: function () { p.setCardFeeOn(!p.cardFeeOn); } },
          e("div", { className: "toggle-track " + (p.cardFeeOn ? "on" : "off") }, e("div", { className: "toggle-thumb" })),
          e("span", { className: "fee-label", style: { minWidth: "auto" } }, "💳 Card Fee (3%)"),
          p.cardFeeOn ? e("span", { className: "fee-calc" }, "+" + fmt(t.cardFeeAmt) + "đ") : null
        ),
        e("textarea", {
          className: "nti", style: { marginTop: 4 }, placeholder: "Order notes...",
          value: p.orderNotes, onChange: function (ev) { p.setOrderNotes(ev.target.value); }
        }),

        e("div", { className: "sum" },
          e("div", { className: "sr" }, e("span", { className: "sl" }, "Subtotal"), e("span", { className: "sv" }, fmt(t.subtotal) + "đ")),
          t.itemDiscTotal > 0 ? e("div", { className: "sr" }, e("span", { className: "sl" }, "Item discounts"), e("span", { className: "sv", style: { color: "var(--red)" } }, "−" + fmt(t.itemDiscTotal) + "đ")) : null,
          t.billDiscAmt > 0 ? e("div", { className: "sr" }, e("span", { className: "sl" }, "Bill discount" + (t.billDiscPct > 0 ? " (" + t.billDiscPct + "%)" : "")), e("span", { className: "sv", style: { color: "var(--red)" } }, "−" + fmt(t.billDiscAmt) + "đ")) : null,
          e("div", { className: "sr sub" },
            e("span", { className: "sl" }, "Net ", e("span", { style: { fontSize: 11, opacity: 0.6 } }, "(comm. base)")),
            e("span", { className: "sv" }, fmt(t.netCommBase) + "đ")),
          t.cardFeeAmt > 0 ? e("div", { className: "sr" }, e("span", { className: "sl" }, "💳 Card fee (3%)"), e("span", { className: "sv" }, "+" + fmt(t.cardFeeAmt) + "đ")) : null,
          t.shipAmt > 0 ? e("div", { className: "sr" }, e("span", { className: "sl" }, "📦 Shipping"), e("span", { className: "sv" }, "+" + fmt(t.shipAmt) + "đ")) : null,
          e("div", { className: "sr tot" }, e("span", null, "Grand Total"), e("span", { className: "sv g" }, fmt(t.grandTotal) + "đ")),
          e("div", { className: "sr", style: { paddingTop: 8, fontSize: 12, color: "var(--t3)" } },
            e("span", null, "Commission (" + p.auth.name + ")"),
            e("span", { style: { fontFamily: "'Space Mono',monospace" } }, fmt(t.commFull) + "đ"))
        ),

        e("button", {
          className: "btn btn-g " + (p.submitting ? "btn-d" : ""),
          style: { marginTop: 16 }, onClick: p.submitOrder
        }, p.submitting ? "Saving..." : "Submit Order · " + fmt(t.grandTotal) + "đ")
      ) : null
    ));
  }

  /* Sheet thêm hàng đặt riêng / made-to-order (không có trong kho) */
  function customModal(p) {
    return e("div", { className: "ov", onClick: function (ev) { if (ev.target === ev.currentTarget) p.setShowCustom(false); } },
      e("div", { className: "sheet" }, e("div", { className: "handle" }), e("div", { className: "mbody" },
        e("div", { style: { fontSize: 18, fontWeight: 600, marginBottom: 16 } }, "✏️ Custom / Made-to-Order"),
        e("div", { className: "ml" }, "Item Name"),
        e("input", {
          className: "cinp", style: { width: "100%", marginBottom: 12 }, placeholder: "e.g. Custom Signet Ring...",
          value: p.customName, onChange: function (ev) { p.setCustomName(ev.target.value); }
        }),
        e("div", { className: "ml" }, "Price (đ)"),
        e("input", {
          className: "mi", type: "number", value: p.customPrice || "", placeholder: "0",
          onChange: function (ev) { p.setCustomPrice(parseInt(ev.target.value) || 0); }, style: { marginBottom: 12 }
        }),
        e("div", { style: { fontSize: 12, color: "var(--t3)", marginBottom: 12 } }, "Brand: OR (Order) · Commission uses OR rate"),
        e("button", { className: "btn btn-g " + ((!p.customName || !p.customPrice) ? "btn-d" : ""), onClick: p.addCustomItem }, "Add to Order"),
        e("button", { className: "btn btn-o", onClick: function () { p.setShowCustom(false); } }, "Cancel")
      ))
    );
  }

  VJ.screens.order = order;
  VJ.screens.customModal = customModal;
})();
