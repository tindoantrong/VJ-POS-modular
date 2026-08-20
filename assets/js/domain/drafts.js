/* VJ·POS — quản lý nhiều đơn nháp cùng lúc (nhân viên đang tính cho khách A thì khách B tới).
   Trước đây MainApp có 10 hàm setter gần như giống hệt nhau, mỗi field mới phải chép thêm 1 hàm.
   Giờ tất cả đi qua update(list, id, patch). Thêm field mới = thêm 1 key trong createEmpty(). */
(function () {
  window.VJ = window.VJ || {};

  function createEmpty(id) {
    return {
      id: id,
      label: "Draft " + id,
      cart: [],
      cid: 0,               // bộ đếm cartId, để 2 dòng cùng 1 sản phẩm vẫn tách nhau được
      custName: "",
      custPhone: "",
      billDiscVal: 0,
      billDiscType: "pct",
      shippingFee: 0,
      cardFeeOn: false,
      orderNotes: ""
    };
  }

  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // Gộp patch vào draft đang chọn, giữ nguyên các draft khác (immutable)
  function update(list, id, patch) {
    return list.map(function (d) {
      return d.id === id ? Object.assign({}, d, patch) : d;
    });
  }

  // Riêng cart cho phép truyền hàm updater giống setState để tránh đọc state cũ
  function updateCart(list, id, valOrFn) {
    return list.map(function (d) {
      if (d.id !== id) return d;
      return Object.assign({}, d, {
        cart: typeof valOrFn === "function" ? valOrFn(d.cart) : valOrFn
      });
    });
  }

  // Xoá draft. Không bao giờ trả về mảng rỗng — mảng rỗng từng gây màn hình đen.
  function remove(list, id, nextIdIfEmpty) {
    var remaining = list.filter(function (d) { return d.id !== id; });
    if (remaining.length === 0) return [createEmpty(nextIdIfEmpty)];
    return remaining;
  }

  // Reset draft đang chọn nhưng GIỮ LẠI tab (xoá hẳn rồi tạo lại gây nháy màn hình đen sau khi submit)
  function reset(list, id) {
    return list.map(function (d) {
      return d.id === id ? createEmpty(d.id) : d;
    });
  }

  function totalItems(list) {
    return list.reduce(function (s, d) { return s + d.cart.length; }, 0);
  }

  VJ.drafts = {
    createEmpty: createEmpty,
    find: find,
    update: update,
    updateCart: updateCart,
    remove: remove,
    reset: reset,
    totalItems: totalItems
  };
})();
