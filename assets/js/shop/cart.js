/* VJ·SHOP — logic giỏ hàng. Hàm thuần, không đụng React, không gọi API.
   Số tiền tính ở đây CHỈ để hiển thị cho khách xem. Con số có giá trị pháp lý là số
   server trả về sau khi đặt hàng (xem backend/80_shop.gs). */
(function () {
  window.VJ = window.VJ || {};
  VJ.shop = VJ.shop || {};

  var MAX_QTY = 20;   // phải khớp SHOP_MAX_QTY_PER_LINE bên backend

  // Mỗi dòng giỏ hàng định danh bằng cặp sản phẩm + quy cách
  function keyOf(productId, variantId) {
    return productId + "::" + variantId;
  }

  function add(cart, product, variant, qty) {
    var k = keyOf(product.id, variant.id);
    var found = false;

    var next = cart.map(function (line) {
      if (line.key !== k) return line;
      found = true;
      return Object.assign({}, line, { qty: Math.min(MAX_QTY, line.qty + qty) });
    });

    if (!found) {
      next = next.concat([{
        key: k,
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantLabel: variant.label,
        unitPrice: variant.price,
        img: product.img,
        qty: Math.min(MAX_QTY, qty)
      }]);
    }
    return next;
  }

  function setQty(cart, key, qty) {
    if (qty < 1) return remove(cart, key);
    return cart.map(function (line) {
      return line.key === key ? Object.assign({}, line, { qty: Math.min(MAX_QTY, qty) }) : line;
    });
  }

  function remove(cart, key) {
    return cart.filter(function (line) { return line.key !== key; });
  }

  function totalItems(cart) {
    return cart.reduce(function (s, l) { return s + l.qty; }, 0);
  }

  /* shipping: { fee, freeFrom } — lấy từ API nếu có, không thì dùng mặc định trong products.js */
  function summary(cart, shipping) {
    var itemsTotal = cart.reduce(function (s, l) { return s + l.unitPrice * l.qty; }, 0);
    var freeFrom = shipping.freeFrom;
    var shippingFee = (itemsTotal >= freeFrom || itemsTotal === 0) ? 0 : shipping.fee;
    return {
      itemsTotal: itemsTotal,
      shippingFee: shippingFee,
      grandTotal: itemsTotal + shippingFee,
      freeShip: itemsTotal >= freeFrom && itemsTotal > 0,
      missingForFreeShip: Math.max(0, freeFrom - itemsTotal)
    };
  }

  // Rút gọn để gửi lên server: chỉ id và số lượng. Giá server tự tra, không nhận từ đây.
  function toPayload(cart) {
    return cart.map(function (l) {
      return { productId: l.productId, variantId: l.variantId, qty: l.qty };
    });
  }

  VJ.shop.cart = {
    MAX_QTY: MAX_QTY,
    add: add, setQty: setQty, remove: remove,
    totalItems: totalItems, summary: summary, toPayload: toPayload
  };
})();
