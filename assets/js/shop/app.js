/* VJ·SHOP — điểm vào trang bán gạo. Giữ state + nối dây, phần hiển thị nằm ở shop/ui/. */
(function () {
  var e = React.createElement, Fragment = React.Fragment;
  var useState = React.useState, useEffect = React.useEffect;
  var fmt = VJ.format.fmt;
  var C = VJ.shop.CONTACT;

  var TRUST = [
    ["🌱", "Vì sức khỏe gia đình bạn"],
    ["🛡", "Kiểm soát chất lượng từ nông trại"],
    ["🚚", "Giao hàng toàn quốc"],
    ["🌾", "Không chất bảo quản"]
  ];

  function Shop() {
    var catS = useState(null), catalog = catS[0], setCatalog = catS[1];
    var cartS = useState([]), cart = cartS[0], setCart = cartS[1];
    // view: null | "cart" | "checkout" | "done"
    var vS = useState(null), view = vS[0], setView = vS[1];
    var sbS = useState(false), submitting = sbS[0], setSubmitting = sbS[1];
    var errS = useState(null), error = errS[0], setError = errS[1];
    var resS = useState(null), result = resS[0], setResult = resS[1];
    var toastS = useState(null), toast = toastS[0], setToast = toastS[1];

    useEffect(function () {
      VJ.shop.api.loadCatalog().then(setCatalog);
    }, []);

    // Chừa chỗ cho nút giỏ hàng nổi ở mobile, tránh che nội dung cuối trang
    useEffect(function () {
      document.body.classList.toggle("has-cart", cart.length > 0);
    }, [cart.length]);

    var showToast = function (msg) {
      setToast(msg);
      setTimeout(function () { setToast(null); }, 1800);
    };

    var addToCart = function (product, variant, qty) {
      setCart(function (prev) { return VJ.shop.cart.add(prev, product, variant, qty); });
      showToast("Đã thêm " + product.name + " " + variant.label + " vào giỏ");
    };

    var placeOrder = async function (form) {
      setSubmitting(true);
      setError(null);
      try {
        var res = await VJ.shop.api.submitOrder(form, cart);
        if (!res.ok) throw new Error(res.error || "Không gửi được đơn hàng");
        setResult(res);      // dùng số tiền SERVER trả về, không dùng số tự tính
        setCart([]);
        setView("done");
      } catch (err) {
        setError(err.message);
      } finally {
        setSubmitting(false);
      }
    };

    if (!catalog) {
      return e("div", { className: "load" }, e("div", { className: "spin" }), "Đang tải sản phẩm...");
    }

    var nItems = VJ.shop.cart.totalItems(cart);
    var sum = VJ.shop.cart.summary(cart, catalog.shipping);

    return e(Fragment, null,
      // ── Header ──
      e("header", { className: "hd" },
        e("div", { className: "hd-in" },
          e("div", { className: "hd-logo" },
            e("div", { className: "hd-mark" }, "🌾"),
            e("div", null,
              e("div", { className: "hd-name" }, C.brand),
              e("div", { className: "hd-sub" }, C.brandSub))
          ),
          e("a", { className: "hd-tel", href: "tel:" + C.hotline.replace(/\s/g, "") },
            "📞", e("span", null, C.hotline)),
          e("button", { className: "hd-cart", onClick: function () { setView("cart"); }, "aria-label": "Giỏ hàng" },
            "🛒", nItems > 0 ? e("span", { className: "hd-cart-n" }, nItems) : null)
        )
      ),

      // ── Hero ──
      e("section", { className: "hero" },
        e("div", { className: "wrap hero-in" },
          e("div", { className: "hero-kicker" }, "GẠO VIỆT CHÍNH GỐC"),
          e("h1", null, "Gạo sạch ", e("em", null, "từ thiên nhiên"), " cho bữa cơm gia đình"),
          e("p", null, "Chọn từ giống lúa ngon, đóng túi kín giữ trọn hương thơm. Giao hàng tận nhà toàn quốc."),
          e("a", { className: "hero-cta", href: "#san-pham" }, "Xem sản phẩm ↓")
        )
      ),

      // ── Cam kết ──
      e("section", { className: "trust" },
        e("div", { className: "trust-in" }, TRUST.map(function (t, i) {
          return e("div", { className: "trust-it", key: i },
            e("span", { className: "trust-ic" }, t[0]), e("span", null, t[1]));
        }))
      ),

      // ── Sản phẩm ──
      e("section", { className: "sec", id: "san-pham" },
        e("div", { className: "wrap" },
          e("div", { className: "sec-hd" },
            e("h2", null, "Sản phẩm của chúng tôi"),
            e("p", null, "Hai dòng gạo thơm được ưa chuộng nhất, đóng túi 5kg và 10kg")),
          !catalog.live
            ? e("div", { className: "alert", style: { maxWidth: 620, margin: "0 auto 22px" } },
                "⚠️ Chưa kết nối được máy chủ nên giá hiển thị có thể chưa mới nhất. " +
                "Bạn vẫn đặt hàng được, nhân viên sẽ báo lại giá chính xác khi gọi xác nhận.")
            : null,
          e("div", { className: "pgrid" }, catalog.products.map(function (p) {
            return e(VJ.shop.ui.ProductCard, { key: p.id, product: p, onAdd: addToCart });
          }))
        )
      ),

      // ── Footer ──
      e("footer", { className: "ft" },
        e("div", { className: "ft-in" },
          e("div", null,
            e("div", { className: "ft-brand" }, C.brand),
            e("div", { className: "ft-brand-s" }, C.brandSub),
            e("p", null, "Gạo Việt cho bữa cơm gia đình. Cam kết đúng giống, đúng chất lượng, không pha trộn.")),
          e("div", null,
            e("h4", null, "Liên hệ"),
            e("a", { href: "tel:" + C.hotline.replace(/\s/g, "") }, "📞 " + C.hotline),
            e("a", { href: "mailto:" + C.email }, "✉️ " + C.email),
            e("p", null, "📍 " + C.address)),
          e("div", null,
            e("h4", null, "Chính sách"),
            e("p", null, "Giao hàng toàn quốc"),
            e("p", null, "Miễn phí giao từ " + fmt(catalog.shipping.freeFrom) + "đ"),
            e("p", null, "Đổi trả nếu gạo không đúng mô tả"))
        ),
        e("div", { className: "ft-note" }, "© 2026 " + C.brand + " " + C.brandSub + " · Đặt hàng online 24/7")
      ),

      // ── Nút giỏ hàng nổi (mobile) ──
      nItems > 0 && !view
        ? e("button", { className: "fab", onClick: function () { setView("cart"); } },
            e("span", null, e("span", { className: "fab-n" }, nItems), " sản phẩm"),
            e("span", null, "Xem giỏ · " + fmt(sum.grandTotal) + "đ"))
        : null,

      toast
        ? e("div", { style: { position: "fixed", left: "50%", top: 76, transform: "translateX(-50%)", zIndex: 200,
            background: "var(--green)", color: "#fff", padding: "11px 20px", borderRadius: 99, fontSize: 14,
            fontWeight: 600, boxShadow: "var(--shadow-lg)", maxWidth: "90vw", textAlign: "center" } }, "✓ " + toast)
        : null,

      // ── Các lớp phủ ──
      view === "cart"
        ? e(VJ.shop.ui.CartSheet, {
            cart: cart, shipping: catalog.shipping,
            onClose: function () { setView(null); },
            onCheckout: function () { setError(null); setView("checkout"); },
            onQty: function (k, q) { setCart(VJ.shop.cart.setQty(cart, k, q)); },
            onRemove: function (k) { setCart(VJ.shop.cart.remove(cart, k)); }
          })
        : null,

      view === "checkout"
        ? e(VJ.shop.ui.CheckoutForm, {
            cart: cart, shipping: catalog.shipping, submitting: submitting, error: error,
            onBack: function () { setView("cart"); },
            onClose: function () { if (!submitting) setView(null); },
            onSubmit: placeOrder
          })
        : null,

      view === "done" && result
        ? e(VJ.shop.ui.OrderSuccess, { result: result, onClose: function () { setView(null); setResult(null); } })
        : null
    );
  }

  window.addEventListener("unhandledrejection", function (ev) {
    try { console.error("Lỗi không bắt được:", ev.reason); } catch (e2) {}
  });

  ReactDOM.render(e(VJ.shop.ui.ShopError, null, e(Shop)), document.getElementById("root"));
})();
