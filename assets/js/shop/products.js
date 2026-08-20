/* VJ·SHOP — nội dung trình bày của sản phẩm (ảnh, slogan, mô tả, điểm nổi bật).
   CỐ Ý TÁCH KHỎI GIÁ: giá nằm ở backend/80_shop.gs (SHOP_CATALOG) và là nguồn sự thật
   duy nhất. Giá ghi ở đây chỉ để trang hiện được ngay khi chưa gọi xong API, và luôn bị
   giá từ API ghi đè. Khi khách bấm đặt hàng, server tính lại tiền từ đầu.
   => Muốn đổi giá thật thì sửa backend rồi Deploy, KHÔNG phải sửa file này. */
(function () {
  window.VJ = window.VJ || {};
  VJ.shop = VJ.shop || {};

  VJ.shop.PRODUCTS = [
    {
      id: "ST25",
      name: "Gạo ST25",
      tagline: "Tinh túy từ thiên nhiên – Đẳng cấp gạo Việt",
      desc: "Hạt gạo dài, dẻo thơm đặc trưng, vị ngọt thanh tự nhiên. " +
            "Giống lúa từng được vinh danh ngon nhất thế giới, hợp bữa cơm gia đình mỗi ngày.",
      img: "assets/img/st25-banner.jpg",
      imgGrains: "assets/img/st25-grains.jpg",
      highlights: ["Cơm dẻo thơm ngon", "Hạt gạo dài trắng trong", "An toàn vệ sinh", "Không chất bảo quản"],
      badge: "Bán chạy nhất",
      variants: [
        { id: "5kg", label: "Túi 5kg", price: 185000 },
        { id: "10kg", label: "Túi 10kg", price: 355000 }
      ]
    },
    {
      id: "ST500",
      name: "Gạo ST500",
      tagline: "Ngon cơm – Dẻo mềm – Thơm tự nhiên",
      desc: "Chất lượng từ giống lúa ngon, trọn vẹn trong từng hạt gạo. " +
            "Cơm dẻo mềm, thơm nhẹ, giá hợp lý cho bữa cơm cả nhà.",
      img: "assets/img/st500-banner.jpg",
      imgGrains: "assets/img/st500-grains.jpg",
      highlights: ["Cơm dẻo thơm ngon", "Hạt gạo dài trắng đẹp", "An toàn vệ sinh", "Không chất bảo quản"],
      badge: "Giá tốt",
      variants: [
        { id: "5kg", label: "Túi 5kg", price: 145000 },
        { id: "10kg", label: "Túi 10kg", price: 275000 }
      ]
    }
  ];

  // Chỉ dùng khi chưa gọi được API. Số thật lấy từ getShopProducts().
  VJ.shop.SHIPPING = { fee: 30000, freeFrom: 500000 };

  VJ.shop.CONTACT = {
    brand: "GẠO SẠCH",
    brandSub: "TỪ THIÊN NHIÊN",
    hotline: "0909 123 456",
    address: "123 Đường Lúa Vàng, Quận 1, TP.HCM",
    email: "donhang@gaosach.vn"
  };
})();
