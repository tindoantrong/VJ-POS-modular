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

Danh sách trạng thái khai ở `SHOP_STATUSES` trong [00_schema.gs](../backend/00_schema.gs) —
**một chỗ duy nhất**, cả lúc ghi đơn lẫn lúc dựng dropdown đều đọc từ đó.

## Nhân viên đổi trạng thái ở đâu

Ngay trong spreadsheet, tab `Shop_Orders`. Chưa có màn hình nào trong POS làm việc này.

Mở sheet lên sẽ thấy menu **VJ-POS** cạnh menu Help. Bấm vào một ô bất kỳ trên dòng đơn
cần đổi (bôi đen nhiều dòng thì đổi cả loạt), rồi chọn:

| Menu | Ghi vào sheet |
|---|---|
| ✅ Đã gọi, xác nhận đơn | `status = CONFIRMED` |
| 🚚 Đã giao cho shipper | `status = SHIPPED` |
| 🎉 Giao xong, hoàn tất | `status = DONE` |
| ✖️ Huỷ đơn | `status = CANCELLED` |
| ↩️ Trả về chưa gọi | `status = NEW` |

Mỗi lần bấm, `handled_by` (email Google của người bấm) và `handled_at` được điền tự động —
đây là lý do nên bấm menu thay vì gõ tay vào ô.

Cột `status` cũng là **dropdown chặn gõ sai**, và cả dòng đổi màu theo trạng thái:
nền đỏ nhạt = `NEW`, tức chưa ai gọi. Mở sheet ra là thấy ngay việc cần làm.

> ⚠️ Đổi trạng thái ở đây **không trừ kho, không tính doanh thu**. Xác nhận xong vẫn phải
> lên đơn thật trên POS — đó mới là đơn được tính.

Code: [85_shop_admin.gs](../backend/85_shop_admin.gs). File này chỉ chạy khi có người mở
spreadsheet (`onOpen`), không đụng `doGet`/`doPost`, nên sửa nó **không cần Deploy lại**
web app — `push` là đủ.

**Cài lần đầu / sau khi đổi `SHOP_STATUSES`:** menu VJ-POS → *🎨 Cài lại dropdown + màu cho
Shop_Orders*. Chạy lại bao nhiêu lần cũng được. Sheet dựng mới bằng `setupNewSpreadsheet()`
thì đã có sẵn, không phải bấm.

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
