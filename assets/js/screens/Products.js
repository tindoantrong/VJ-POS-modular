/* VJ·POS — tab Products: thanh tìm kiếm + lưới sản phẩm, chạm vào thẻ là thêm vào giỏ.
   Đây là hàm render thuần (nhận props, trả element) chứ không phải component có state —
   toàn bộ state vẫn nằm ở MainApp, nên tách file không đổi hành vi render của React. */
(function () {
  window.VJ = window.VJ || {};
  VJ.screens = VJ.screens || {};
  var e = React.createElement, Fragment = React.Fragment;
  var fmt = VJ.format.fmt;
  var catIcon = VJ.catalog.catIcon, brandColor = VJ.catalog.brandColor;

  /* Thanh search + pill lọc. Render NGOÀI .main (xem layout.css) nên không cuộn theo lưới hàng. */
  function searchBar(p) {
    return e("div", { className: "search-sticky" },
      e("div", { className: "sbar" },
        e("span", { className: "si" }, "🔍"),
        e("input", {
          placeholder: "Search products or code...",
          value: p.search,
          onChange: function (ev) { p.setSearch(ev.target.value); }
        }),
        p.search ? e("button", { className: "s-clear", onClick: function () { p.setSearch(""); } }, "✕") : null
      ),
      e("div", { className: "flts" },
        e("div", { className: "fs" }, p.categories.slice(0, 15).map(function (c) {
          return e("button", {
            key: c, className: "pill " + (p.catFilter === c ? "on" : ""),
            onClick: function () { p.setCatFilter(c); }
          }, c === "ALL" ? "All Types" : catIcon(c) + " " + c);
        })),
        e("div", { className: "fd" }),
        e("div", { className: "fs" }, p.brands.map(function (b) {
          return e("button", {
            key: b, className: "pill " + (p.brandFilter === b ? "on" : ""),
            onClick: function () { p.setBrandFilter(b); }
          }, b === "ALL" ? "All Brands" : b);
        }))
      )
    );
  }

  function grid(p) {
    return e(Fragment, null,
      e("div", { className: "pcnt" },
        p.filtered.length + " products" + (p.search ? " for \"" + p.search + "\"" : "") + " · tap to add"),
      e("div", { className: "pgrid" }, p.filtered.map(function (prod) {
        return e("div", { key: prod.id, className: "pcard", onClick: function () { p.quickAdd(prod); } },
          e("div", { className: "pimg" },
            prod.img ? e("img", { src: prod.img, alt: "", loading: "lazy" }) : catIcon(prod.type),
            e("span", { className: "pbadge", style: { background: brandColor(prod.brand) } }, prod.brand || "—"),
            prod.qty <= 5 && prod.qty > 0 ? e("span", { className: "pstock", style: { color: "#FBBF24" } }, prod.qty + " left") : null,
            prod.qty === 0 ? e("span", { className: "pstock", style: { color: "var(--red)" } }, "Out") : null,
            p.justAddedId === prod.id ? e("div", { className: "p-added" }, e("span", { className: "p-added-icon" }, "✓")) : null,
            p.cartQtyMap[prod.id] > 0 ? e("div", { className: "p-cart-qty" }, p.cartQtyMap[prod.id]) : null
          ),
          e("div", { className: "pinfo" },
            e("div", { className: "pname" }, prod.name),
            e("div", { className: "pprice" }, fmt(prod.price) + "đ"),
            e("div", { className: "pid" }, prod.id)
          )
        );
      })),
      !p.filtered.length
        ? e("div", { className: "empty" }, e("div", { className: "empty-i" }, "🔍"), e("div", { className: "empty-t" }, "No products found"))
        : null
    );
  }

  VJ.screens.productsSearchBar = searchBar;
  VJ.screens.products = grid;
})();
