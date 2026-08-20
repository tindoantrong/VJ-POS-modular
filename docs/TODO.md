# VJ·POS — TODO

## ✅ Đã xong

- [x] Giao diện POS mobile-first (tối ưu iPhone)
- [x] Đăng nhập PIN, phân quyền theo role
- [x] Tìm kiếm, lọc theo loại hàng / brand
- [x] Giỏ hàng: sửa số lượng, sửa giá
- [x] Giảm giá từng dòng (tiền hoặc %)
- [x] Giảm giá cả bill (tiền hoặc %)
- [x] Phí thẻ 3%, phí ship
- [x] Ghi đơn vào Google Sheets
- [x] Lịch sử đơn + trạng thái thanh toán
- [x] Ghi nhận thanh toán (cash, POS, chuyển khoản, PayPal)
- [x] Huỷ đơn kèm hoàn kho (admin)
- [x] Tính hoa hồng theo brand
- [x] Nhập kho hàng loạt (admin)
- [x] Chuẩn hoá giá đuôi 50K/90K
- [x] Safe area cho tai thỏ iPhone
- [x] Nhiều đơn nháp song song
- [x] Badge Orders đếm đơn chưa thu đủ tiền
- [x] **Tách source thành module** (2026-02-24) — xem [ARCHITECTURE.md](ARCHITECTURE.md)

## 🔬 Cần xác minh trên máy thật

### Thanh search có còn bị cuộn mất không?
Bug này ghi là chưa fix, nhưng đọc lại code thì **cách làm hiện tại đúng rồi**:
`.app` cao `100dvh` + `overflow:hidden`, `.search-sticky` là flex sibling nằm NGOÀI `.main`,
`.main` là vùng `overflow-y:auto` duy nhất. Đây chính là "cách 2" mà ghi chú cũ nói là thất bại —
có thể lúc đó `.app` chưa khoá chiều cao nên mới không ăn.

**Việc cần làm:** mở trên iPhone Safari thật, tab Products, cuộn xuống. Nếu thanh search
đứng yên → xoá mục này. Nếu vẫn trôi → sửa trong [layout.css](../assets/css/layout.css).

## 🐛 Bug đã sửa (2026-02-24) — cần xác minh sau khi deploy backend

| Bug | Ảnh hưởng | Đã sửa ở |
|---|---|---|
| `bulk_import` ghi `ten_hang = "Hàng hóa"` cố định, tên thật lại ghi vào `nhom_hang` | Mọi sản phẩm nhập mới hiện tên "Hàng hóa" trên màn bán hàng | `backend/70_stock.gs` |
| `void_order` dùng `row[cIOrder]` không kiểm tra `-1` | Thiếu header → huỷ đơn mà KHÔNG hoàn kho, im lặng | `backend/50_orders.gs` |
| `add_payment` không có LockService | 2 người thu tiền cùng lúc → mất một khoản trong `collected_total` | `backend/60_payments.gs` |
| `add_payment` không kiểm tra đơn tồn tại | Gõ sai orderId → dòng Payments mồ côi | `backend/60_payments.gs` |
| `_nextOrderId_` đọc cứng cột A, suy từ dòng cuối | Sort lại sheet → sinh mã đơn trùng | `backend/50_orders.gs` |
| Công thức hoa hồng viết trùng 2 chỗ | Sửa 1 chỗ quên chỗ kia → hoa hồng hiển thị khác hoa hồng ghi sổ | `assets/js/domain/totals.js` |
| PIN nằm trong query string GET | PIN bị ghi vào execution log của Apps Script | `assets/js/api/client.js` + `backend/10_http.gs` |

> Cách xác minh `bulk_import`: nhập thử 1 sản phẩm mới rồi xem tab Products —
> phải hiện đúng tên vừa nhập, không phải "Hàng hóa".

## ⚡ Nợ kỹ thuật đã biết

- **`getOrders` đọc toàn bộ `Order_Items` và `Payments`** mỗi lần mở app, trong khi `Orders`
  đã giới hạn 100 dòng. Sheet càng lớn app càng chậm. Cần đọc ngược từ dưới lên và dừng sớm.
- **`login` cũng quét toàn bộ `Order_Items`** để tính hoa hồng. Nên chuyển sang sheet tổng hợp
  theo tháng, hoặc cache bằng `CacheService`.
- **Draft không được lưu.** Refresh trang là mất hết đơn đang tính dở. Nên lưu `localStorage`.
- **`_tryUnprotect_` gỡ toàn bộ protection của sheet** rồi mới đặt lại — trong lúc đó sheet
  không được bảo vệ.
- Chưa có test tự động. `domain/totals.js` và `domain/drafts.js` là hàm thuần, viết test được ngay.

## 📋 Tính năng dự kiến

### Quy trình nhận hàng ký gửi
- Nhân viên chụp ảnh hàng mới của artist
- Artist nhập giá sỉ từ xa
- Nhân viên đặt tên sản phẩm (không thấy giá vốn)
- Mai duyệt giá bán lẻ cuối cùng
- Tự động đẩy vào danh mục POS

### Hot Choco AI Accountant
- Telegram bot truy vấn dữ liệu POS thời gian thực
- Tổng kết doanh số ngày/tuần
- Hỏi bằng ngôn ngữ tự nhiên ("hôm nay bán được bao nhiêu?")

### Chuyển thành app mobile
- Đánh giá Glide/Adalo
- Đồng bộ real-time với Google Sheets
- Hoạt động offline, push notification

### Sau nữa
- Cơ sở dữ liệu khách hàng / CRM
- Hoá đơn điện tử (Telegram/email)
- Cảnh báo sắp hết hàng
- Dashboard phân tích doanh số
