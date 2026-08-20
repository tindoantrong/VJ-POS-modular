# Trang bán gạo cho khách lẻ (index.html — TRANG CHỦ)

Trang công khai, khách tự vào đặt hàng, **không cần đăng nhập, không cần PIN**.
Chạy song song với POS trên cùng backend, cùng spreadsheet.

```
index.html  → TRANG CHỦ, khách lẻ đặt online, KHÔNG cần đăng nhập → sheet Shop_Orders
pos.html    → POS trong tiệm, nhân viên đăng nhập bằng PIN       → sheet Orders
```

## Vì sao tách sheet riêng

Đơn POS là **doanh thu đã chốt**: trừ kho, tính hoa hồng nhân viên, vào báo cáo.
Đơn từ web mới chỉ là **đơn chờ xác nhận** — khách có thể bỏ bom, gõ nhầm số điện thoại,
hoặc là bot. Nếu ghi thẳng vào `Orders` thì tồn kho và doanh thu sẽ sai ngay lập tức.

Nên đơn web vào `Shop_Orders` với `status = NEW`, **không trừ kho**. Nhân viên gọi xác nhận,
rồi mới lên đơn thật trên POS.

Vòng đời: `NEW` → `CONFIRMED` → `SHIPPED` → `DONE` (hoặc `CANCELLED`).
Cột `handled_by` / `handled_at` để biết ai xử lý, lúc nào.

## Bảo mật: endpoint public thì không được tin client

`customer_order` là lối ghi **duy nhất** không cần PIN, nên nó tự lo bảo vệ:

| Rủi ro | Cách chặn |
|---|---|
| Sửa giá trong payload rồi mua 1đ | Client **không gửi giá**. Server tính lại 100% từ `SHOP_CATALOG` trong [80_shop.gs](../backend/80_shop.gs) |
| Bot spam đơn ảo | Honeypot (ô ẩn `website`) + giới hạn 3 đơn/số điện thoại/giờ + trần 60 đơn/giờ toàn hệ thống |
| Đặt 999.999 túi | Tối đa 20 túi/dòng, 10 dòng/đơn |
| Dữ liệu rác | Server kiểm lại tên, số điện thoại (regex số VN), địa chỉ — không tin validate ở trình duyệt |

Apps Script không cho biết IP người gọi nên không chặn được theo IP. Chặn theo số điện thoại
là biện pháp thực tế nhất, cộng trần toàn hệ thống để kẻ đổi số liên tục không làm ngập sheet.

> Vẫn còn một điểm yếu: kẻ xấu đổi số điện thoại mỗi lần vẫn đặt được tới trần 60 đơn/giờ.
> Nếu bị spam thật thì thêm captcha, hoặc bắt xác thực OTP qua SMS.

## Đổi giá

Sửa `SHOP_CATALOG` trong [backend/80_shop.gs](../backend/80_shop.gs) rồi Deploy lại. **Hết.**
Không cần đụng frontend — trang tự lấy giá mới qua `?action=shop_products`.

Giá ghi trong `assets/js/shop/products.js` chỉ là bản dự phòng để trang hiện được ngay
lúc chưa gọi xong API, và luôn bị giá từ API ghi đè. Đừng coi nó là giá thật.

Phí ship và ngưỡng miễn phí cũng nằm trong `80_shop.gs`
(`SHOP_SHIPPING_FEE`, `SHOP_FREE_SHIP_FROM`).

## Đổi nội dung trình bày

`assets/js/shop/products.js` — tên, slogan, mô tả, điểm nổi bật, nhãn "Bán chạy nhất",
thông tin liên hệ (hotline, email, địa chỉ). Sửa xong nhớ bump `?v=` trong `index.html`.

## Ảnh sản phẩm

Xem [assets/img/README.md](../assets/img/README.md). Thiếu ảnh trang vẫn chạy —
thẻ sản phẩm tự hiện khối thay thế thay vì vỡ layout.

## Cấu trúc file

```
index.html                     TRANG CHỦ — trang bán hàng (tách hẳn khỏi pos.html của POS)
assets/css/shop.css            bộ CSS riêng, sáng — KHÔNG dùng chung CSS tối của POS
assets/js/shop/
  products.js                  nội dung trình bày + giá dự phòng
  cart.js                      logic giỏ hàng, hàm thuần
  api.js                       gọi shop_products và customer_order
  ui/ShopError.js              chặn màn hình trắng
  ui/ProductCard.js            thẻ sản phẩm
  ui/CartSheet.js              giỏ hàng
  ui/CheckoutForm.js           form nhận hàng
  ui/OrderSuccess.js           màn đặt hàng thành công
  app.js                       state + nối dây
backend/80_shop.gs             bảng giá, tính tiền, chống spam, ghi Shop_Orders
```

Dùng chung với POS: `assets/js/config.js` (URL API), `assets/js/lib/format.js`,
`assets/js/api/client.js`.

## Cài đặt

Spreadsheet cần thêm 2 sheet `Shop_Orders` và `Shop_Order_Items` — chạy lại
`setupNewSpreadsheet()` là nó tự tạo, các sheet cũ giữ nguyên không bị đụng.
Rồi dán `80_shop.gs` vào Apps Script và Deploy bản mới.
