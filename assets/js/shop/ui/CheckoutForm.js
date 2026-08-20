/* VJ·SHOP — form thông tin nhận hàng.
   Có kiểm tra dữ liệu ngay tại trình duyệt cho khách đỡ mất công, NHƯNG server vẫn kiểm
   lại toàn bộ (backend/80_shop.gs) vì endpoint public thì không được tin client. */
(function () {
  window.VJ = window.VJ || {};
  VJ.shop = VJ.shop || {}; VJ.shop.ui = VJ.shop.ui || {};
  var e = React.createElement;
  var useState = React.useState;
  var fmt = VJ.format.fmt;

  // Số VN: 0xxxxxxxxx hoặc +84xxxxxxxxx, cho phép khách gõ khoảng trắng / dấu chấm
  function validate(f) {
    var errs = {};
    if (f.name.trim().length < 2) errs.name = "Vui lòng nhập họ tên";
    var phone = f.phone.replace(/[^0-9+]/g, "");
    if (!/^(0|\+84)[0-9]{8,10}$/.test(phone)) errs.phone = "Số điện thoại không hợp lệ";
    if (f.address.trim().length < 8) errs.address = "Vui lòng nhập địa chỉ đầy đủ để shipper tìm được";
    return errs;
  }

  function CheckoutForm(props) {
    var fS = useState({ name: "", phone: "", address: "", note: "", paymentMethod: "cod", website: "" });
    var form = fS[0], setForm = fS[1];
    var eS = useState({}), errs = eS[0], setErrs = eS[1];

    var sum = VJ.shop.cart.summary(props.cart, props.shipping);
    var set = function (k, v) { setForm(Object.assign({}, form, { [k]: v })); };

    var submit = function () {
      var found = validate(form);
      setErrs(found);
      if (Object.keys(found).length) return;
      props.onSubmit(Object.assign({}, form, { phone: form.phone.replace(/[^0-9+]/g, "") }));
    };

    var field = function (key, label, required, opts) {
      opts = opts || {};
      return e("div", { className: "fld" + (errs[key] ? " err" : "") },
        e("label", null, label, required ? e("i", null, " *") : null),
        opts.textarea
          ? e("textarea", {
              value: form[key], placeholder: opts.placeholder || "",
              onChange: function (ev) { set(key, ev.target.value); }
            })
          : e("input", {
              type: opts.type || "text", value: form[key], placeholder: opts.placeholder || "",
              inputMode: opts.inputMode, autoComplete: opts.autoComplete,
              onChange: function (ev) { set(key, ev.target.value); }
            }),
        errs[key] ? e("div", { className: "fld-err" }, errs[key]) : null
      );
    };

    return e("div", { className: "ov", onClick: function (ev) { if (ev.target === ev.currentTarget && !props.submitting) props.onClose(); } },
      e("div", { className: "sheet" },
        e("div", { className: "sheet-hd" },
          e("button", { className: "sheet-x", onClick: props.onBack, "aria-label": "Quay lại" }, "‹"),
          e("h3", null, "Thông tin nhận hàng"),
          e("button", { className: "sheet-x", onClick: props.onClose, "aria-label": "Đóng" }, "✕")
        ),

        e("div", { className: "sheet-bd" },
          props.error ? e("div", { className: "alert" }, "⚠️ " + props.error) : null,

          field("name", "Họ và tên", true, { placeholder: "Nguyễn Văn A", autoComplete: "name" }),
          field("phone", "Số điện thoại", true, { placeholder: "0909 123 456", type: "tel", inputMode: "tel", autoComplete: "tel" }),
          field("address", "Địa chỉ nhận hàng", true, { textarea: true, placeholder: "Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" }),
          field("note", "Ghi chú", false, { textarea: true, placeholder: "Ví dụ: giao giờ hành chính, gọi trước khi tới..." }),

          // Honeypot — người thật không nhìn thấy ô này nên nó luôn rỗng. Bot điền vào thì bị chặn.
          e("input", {
            className: "hp", tabIndex: -1, autoComplete: "off", "aria-hidden": "true",
            value: form.website, onChange: function (ev) { set("website", ev.target.value); }
          }),

          e("div", { className: "fld" },
            e("label", null, "Hình thức thanh toán"),
            e("div", { className: "pay" },
              [["cod", "💵", "Thanh toán khi nhận", "Trả tiền mặt cho shipper"],
               ["transfer", "🏦", "Chuyển khoản", "Nhân viên gửi số tài khoản"]].map(function (m) {
                return e("button", {
                  key: m[0], className: form.paymentMethod === m[0] ? "on" : "",
                  onClick: function () { set("paymentMethod", m[0]); }
                },
                  e("span", { className: "pay-ic" }, m[1]),
                  e("span", null,
                    e("span", { className: "pay-t" }, m[2]),
                    e("span", { className: "pay-s", style: { display: "block" } }, m[3]))
                );
              })
            )
          ),

          e("div", { className: "sum" },
            e("div", { className: "sum-r" }, e("span", null, "Tạm tính"), e("b", null, fmt(sum.itemsTotal) + "đ")),
            e("div", { className: "sum-r" },
              e("span", null, "Phí giao hàng"),
              e("b", null, sum.shippingFee === 0 ? "Miễn phí" : fmt(sum.shippingFee) + "đ")),
            e("div", { className: "sum-r tot" }, e("span", null, "Tổng cộng"), e("b", null, fmt(sum.grandTotal) + "đ"))
          )
        ),

        e("div", { className: "sheet-ft" },
          e("button", { className: "btn btn-main", disabled: props.submitting, onClick: submit },
            props.submitting ? e("span", { className: "spin" }) : "Xác nhận đặt hàng"),
          e("div", { style: { fontSize: 12.5, color: "var(--ink-3)", textAlign: "center", marginTop: 10 } },
            "Nhân viên sẽ gọi xác nhận trước khi giao hàng")
        )
      )
    );
  }

  VJ.shop.ui.CheckoutForm = CheckoutForm;
  VJ.shop.ui.validateCheckout = validate;
})();
