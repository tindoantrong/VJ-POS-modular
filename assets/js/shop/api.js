/* VJ·SHOP — gọi API cho trang bán hàng. Dùng chung VJ.api (assets/js/api/client.js).
   Hai endpoint, đều KHÔNG cần PIN:
     GET  shop_products  → bảng giá
     POST customer_order → đặt hàng */
(function () {
  window.VJ = window.VJ || {};
  VJ.shop = VJ.shop || {};

  /* Lấy bảng giá từ server và ghép vào dữ liệu trình bày trong products.js.
     Nếu API lỗi thì trả về nguyên dữ liệu tĩnh — trang vẫn xem được, chỉ là giá có thể cũ.
     Không sao vì lúc đặt hàng server vẫn tính lại từ đầu. */
  function loadCatalog() {
    return VJ.api.get("shop_products").then(function (res) {
      if (!res || !res.ok) throw new Error(res && res.error ? res.error : "Không tải được bảng giá");

      var priceMap = {};
      (res.products || []).forEach(function (p) {
        (p.variants || []).forEach(function (v) {
          priceMap[p.id + "::" + v.id] = { price: v.price, label: v.label };
        });
      });

      var products = VJ.shop.PRODUCTS.map(function (p) {
        return Object.assign({}, p, {
          variants: p.variants.map(function (v) {
            var live = priceMap[p.id + "::" + v.id];
            return live ? Object.assign({}, v, { price: live.price, label: live.label }) : v;
          })
        });
      });

      return {
        products: products,
        shipping: {
          fee: res.shippingFee != null ? res.shippingFee : VJ.shop.SHIPPING.fee,
          freeFrom: res.freeShipFrom != null ? res.freeShipFrom : VJ.shop.SHIPPING.freeFrom
        },
        live: true
      };
    }).catch(function () {
      return { products: VJ.shop.PRODUCTS, shipping: VJ.shop.SHIPPING, live: false };
    });
  }

  /* Gửi đơn. KHÔNG gửi giá — server tự tra bảng giá của nó.
     Trường `website` là honeypot: người thật không thấy ô này nên luôn rỗng. */
  function submitOrder(form, cart) {
    return VJ.api.post({
      action: "customer_order",
      customerName: form.name,
      customerPhone: form.phone,
      customerAddress: form.address,
      note: form.note,
      paymentMethod: form.paymentMethod,
      website: form.website || "",
      items: VJ.shop.cart.toPayload(cart)
    });
  }

  VJ.shop.api = { loadCatalog: loadCatalog, submitOrder: submitOrder };
})();
