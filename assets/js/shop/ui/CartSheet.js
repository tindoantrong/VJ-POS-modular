/* VJ·SHOP — giỏ hàng dạng bottom sheet: sửa số lượng, xoá dòng, xem tổng tiền. */
(function () {
  window.VJ = window.VJ || {};
  VJ.shop = VJ.shop || {}; VJ.shop.ui = VJ.shop.ui || {};
  var e = React.createElement;
  var fmt = VJ.format.fmt;

  function CartSheet(props) {
    var cart = props.cart;
    var sum = VJ.shop.cart.summary(cart, props.shipping);

    var body = !cart.length
      ? e("div", { style: { textAlign: "center", padding: "48px 20px", color: "var(--ink-3)" } },
          e("div", { style: { fontSize: 46, marginBottom: 12 } }, "🛒"),
          e("div", { style: { fontSize: 15 } }, "Giỏ hàng của bạn đang trống")
        )
      : e(React.Fragment, null,
          cart.map(function (line) {
            return e("div", { className: "ci", key: line.key },
              e("div", { className: "ci-img" },
                line.img ? e("img", { src: line.img, alt: "", onError: function (ev) { ev.target.style.display = "none"; } }) : "🌾"),
              e("div", { className: "ci-bd" },
                e("div", { className: "ci-n" }, line.productName),
                e("div", { className: "ci-v" }, line.variantLabel + " · " + fmt(line.unitPrice) + "đ/túi"),
                e("div", { className: "ci-row" },
                  e("div", { className: "qty sm" },
                    e("button", { onClick: function () { props.onQty(line.key, line.qty - 1); }, "aria-label": "Giảm" }, "−"),
                    e("span", null, line.qty),
                    e("button", { onClick: function () { props.onQty(line.key, line.qty + 1); }, "aria-label": "Tăng" }, "+")
                  ),
                  e("button", { className: "ci-rm", onClick: function () { props.onRemove(line.key); } }, "Xoá"),
                  e("div", { className: "ci-p" }, fmt(line.unitPrice * line.qty) + "đ")
                )
              )
            );
          }),

          e("div", { className: "sum" },
            e("div", { className: "sum-r" }, e("span", null, "Tạm tính"), e("b", null, fmt(sum.itemsTotal) + "đ")),
            e("div", { className: "sum-r" },
              e("span", null, "Phí giao hàng"),
              e("b", null, sum.shippingFee === 0 ? "Miễn phí" : fmt(sum.shippingFee) + "đ")),
            e("div", { className: "sum-r tot" }, e("span", null, "Tổng cộng"), e("b", null, fmt(sum.grandTotal) + "đ"))
          ),

          !sum.freeShip
            ? e("div", { className: "freeship" },
                e("span", null, "🚚"),
                e("span", null, "Mua thêm ", e("b", null, fmt(sum.missingForFreeShip) + "đ"), " để được miễn phí giao hàng"))
            : e("div", { className: "freeship" }, e("span", null, "🎉"), e("span", null, "Đơn của bạn được miễn phí giao hàng"))
        );

    return e("div", { className: "ov", onClick: function (ev) { if (ev.target === ev.currentTarget) props.onClose(); } },
      e("div", { className: "sheet" },
        e("div", { className: "sheet-hd" },
          e("h3", null, "Giỏ hàng"),
          e("button", { className: "sheet-x", onClick: props.onClose, "aria-label": "Đóng" }, "✕")
        ),
        e("div", { className: "sheet-bd" }, body),
        cart.length
          ? e("div", { className: "sheet-ft" },
              e("button", { className: "btn btn-main", onClick: props.onCheckout },
                "Đặt hàng · " + fmt(sum.grandTotal) + "đ"),
              e("button", { className: "btn btn-ghost", onClick: props.onClose }, "Tiếp tục mua hàng")
            )
          : null
      )
    );
  }

  VJ.shop.ui.CartSheet = CartSheet;
})();
