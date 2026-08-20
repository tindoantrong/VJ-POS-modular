/* VJ·SHOP — thẻ sản phẩm: chọn quy cách (5kg/10kg), chọn số lượng, thêm vào giỏ. */
(function () {
  window.VJ = window.VJ || {};
  VJ.shop = VJ.shop || {}; VJ.shop.ui = VJ.shop.ui || {};
  var e = React.createElement;
  var useState = React.useState;
  var fmt = VJ.format.fmt;

  function ProductCard(props) {
    var p = props.product;
    var vS = useState(p.variants[0]), variant = vS[0], setVariant = vS[1];
    var qS = useState(1), qty = qS[0], setQty = qS[1];
    var imgS = useState(true), imgOk = imgS[0], setImgOk = imgS[1];

    var addToCart = function () {
      props.onAdd(p, variant, qty);
      setQty(1);
    };

    return e("article", { className: "pcard" },
      e("div", { className: "pmedia" },
        p.badge ? e("span", { className: "pbadge" }, p.badge) : null,
        imgOk
          ? e("img", {
              src: p.img, alt: p.name, loading: "lazy",
              onError: function () { setImgOk(false); }   // chưa có file ảnh thì hiện khối thay thế
            })
          : e("div", { className: "pmedia-fb" },
              e("div", { className: "pmedia-fb-ic" }, "🌾"),
              e("div", { className: "pmedia-fb-t" }, p.name),
              e("div", { className: "pmedia-fb-s" }, "Đang cập nhật hình ảnh")
            )
      ),

      e("div", { className: "pbody" },
        e("h3", { className: "pname" }, p.name),
        e("div", { className: "ptag" }, p.tagline),
        e("p", { className: "pdesc" }, p.desc),

        e("div", { className: "phl" }, p.highlights.map(function (h, i) {
          return e("span", { key: i }, h);
        })),

        e("div", { className: "pvar" }, p.variants.map(function (v) {
          return e("button", {
            key: v.id,
            className: variant.id === v.id ? "on" : "",
            aria: v.label,
            onClick: function () { setVariant(v); }
          },
            e("div", { className: "pvar-l" }, v.label),
            e("div", { className: "pvar-p" }, fmt(v.price) + "đ")
          );
        })),

        e("div", { className: "pfoot" },
          e("div", { className: "qty" },
            e("button", { onClick: function () { setQty(Math.max(1, qty - 1)); }, "aria-label": "Giảm" }, "−"),
            e("span", null, qty),
            e("button", { onClick: function () { setQty(Math.min(VJ.shop.cart.MAX_QTY, qty + 1)); }, "aria-label": "Tăng" }, "+")
          ),
          e("button", { className: "padd", onClick: addToCart },
            "Thêm vào giỏ · " + fmt(variant.price * qty) + "đ")
        )
      )
    );
  }

  VJ.shop.ui.ProductCard = ProductCard;
})();
