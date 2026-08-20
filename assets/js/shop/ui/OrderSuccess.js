/* VJ·SHOP — màn báo đặt hàng thành công.
   Số tiền hiển thị ở đây lấy từ SERVER trả về, không phải số client tự tính — nếu bảng giá
   vừa thay đổi thì khách thấy đúng số sẽ phải trả. */
(function () {
  window.VJ = window.VJ || {};
  VJ.shop = VJ.shop || {}; VJ.shop.ui = VJ.shop.ui || {};
  var e = React.createElement;
  var fmt = VJ.format.fmt;

  function OrderSuccess(props) {
    var r = props.result;

    return e("div", { className: "ov" },
      e("div", { className: "sheet" },
        e("div", { className: "sheet-bd" },
          e("div", { className: "done" },
            e("div", { className: "done-ic" }, "✓"),
            e("h3", null, "Đặt hàng thành công!"),
            e("p", null, "Cảm ơn bạn đã tin tưởng. Nhân viên sẽ gọi xác nhận trong thời gian sớm nhất."),

            e("div", { className: "done-code" },
              e("div", { className: "done-code-l" }, "MÃ ĐƠN HÀNG"),
              e("div", { className: "done-code-v" }, r.orderId)
            ),

            e("div", { className: "sum", style: { marginTop: 0, textAlign: "left" } },
              e("div", { className: "sum-r" }, e("span", null, "Tiền hàng"), e("b", null, fmt(r.itemsTotal) + "đ")),
              e("div", { className: "sum-r" },
                e("span", null, "Phí giao hàng"),
                e("b", null, r.shippingFee === 0 ? "Miễn phí" : fmt(r.shippingFee) + "đ")),
              e("div", { className: "sum-r tot" }, e("span", null, "Tổng cộng"), e("b", null, fmt(r.grandTotal) + "đ"))
            ),

            e("p", { style: { marginTop: 18, marginBottom: 0, fontSize: 13.5 } },
              "Cần hỗ trợ gấp? Gọi ",
              e("a", { href: "tel:" + VJ.shop.CONTACT.hotline.replace(/\s/g, ""),
                       style: { color: "var(--green)", fontWeight: 700 } }, VJ.shop.CONTACT.hotline))
          )
        ),
        e("div", { className: "sheet-ft" },
          e("button", { className: "btn btn-main", onClick: props.onClose }, "Tiếp tục mua hàng")
        )
      )
    );
  }

  VJ.shop.ui.OrderSuccess = OrderSuccess;
})();
