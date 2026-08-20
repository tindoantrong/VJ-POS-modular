# VJ·POS — Viet Jewelers Point of Sale

Ứng dụng bán hàng mobile-first cho tiệm trang sức tại Việt Nam. Frontend tĩnh trên GitHub Pages,
backend là Google Apps Script, database là Google Sheets.

**Live:** https://maipham1712-collab.github.io/VJ-Pos/

## Tech stack

- **Frontend:** React 18 qua CDN, CSS thuần, **không có build step**. Component viết bằng
  `React.createElement` (không JSX).
- **Backend:** Google Apps Script web app (REST)
- **Database:** Google Sheets — `Admin_Products`, `Orders`, `Order_Items`, `Payments`,
  `Admin_Staff`, `Admin_Artists`, `Admin_Stock_Log`
- **Hosting:** GitHub Pages
- **Tự động hoá:** n8n self-hosted + Telegram bot

## Cấu trúc thư mục

```
index.html                 ← khung HTML + danh sách script (không chứa logic)
assets/css/
  tokens.css               ← màu, bo góc, font
  layout.css               ← khung .app/.top/.main/.tabs  (dễ vỡ nhất)
  components.css           ← nút, sheet, form, giỏ hàng, bảng tổng
  screens.css              ← style riêng từng màn hình
assets/js/
  config.js                ← URL API, phí thẻ, BUILD_VERSION
  lib/                     ← format số, bảng brand/icon
  api/client.js            ← nơi DUY NHẤT gọi fetch
  domain/                  ← công thức tiền + quản lý đơn nháp (hàm thuần)
  ui/                      ← component dùng chung
  screens/                 ← 5 màn hình
  app.js                   ← state + nối dây
backend/                   ← Apps Script, 10 file .gs (xem backend/README.md)
docs/
  RUNBOOK.md               ← ⭐ dựng lại từ số 0 + 6 cạm bẫy đã gặp, đọc cái này trước
  SETUP.md                 ← hướng dẫn chi tiết từng bước (bản làm tay)
  ARCHITECTURE.md          ← quy ước code, sửa gì ở đâu
  SHEETS.md                ← cấu trúc Google Sheets
  TODO.md                  ← bug và tính năng đang chờ
```

**Muốn chạy trên spreadsheet của riêng bạn?** Làm theo [docs/SETUP.md](docs/SETUP.md) —
có script tự dựng cả 7 sheet, khỏi gõ tay.

Bắt đầu đọc code từ [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Cách hoạt động

1. Nhân viên nhập PIN 4 số → xác thực với sheet `Admin_Staff` → màn chào hiện hoa hồng
   tháng này và tháng trước
2. Tab Products → tìm/lọc → chạm để thêm vào giỏ
3. Tab Order → sửa số lượng/giá, giảm giá từng dòng và cả bill, phí thẻ 3%, phí ship → Submit
4. Đơn ghi vào Google Sheets, tồn kho tự trừ, ghi log biến động kho
5. Tab Orders → theo dõi công nợ, thu tiền nhiều lần, admin huỷ đơn (tự hoàn kho)

Nhân viên mở được **nhiều đơn nháp** cùng lúc và chuyển qua lại — khách A đang chọn thì
vẫn tính được cho khách B.

## Tính năng

- Đăng nhập PIN, phân quyền admin / staff
- Danh mục có ảnh, lọc theo loại hàng và brand
- Giỏ hàng: sửa giá, giảm giá theo tiền hoặc %, cả dòng lẫn cả bill
- Phí thẻ 3%, phí ship, ghi chú đơn
- Nhiều đơn nháp song song
- Lịch sử đơn + trạng thái thanh toán (paid / partial / unpaid)
- Huỷ đơn kèm hoàn kho (chỉ admin)
- Tính hoa hồng theo brand
- Nhập kho hàng loạt bằng cách dán từ spreadsheet (chỉ admin)

## Phát triển

Chạy local qua web server bất kỳ (WAMP/XAMPP: đặt trong `www/`, mở
`http://localhost/VJ-Pos/`). Mở thẳng bằng `file://` cũng chạy vì không dùng ES module.

Deploy frontend: commit lên `main`, GitHub Pages tự build 1–2 phút.

> ⚠️ **Mỗi lần deploy phải bump version cache-busting**, nếu không iPhone dùng file cũ:
> sửa `BUILD_VERSION` trong [assets/js/config.js](assets/js/config.js) và Find & Replace
> toàn bộ `?v=...` trong [index.html](index.html) cho khớp.

Deploy backend: xem [backend/README.md](backend/README.md).

## Chẩn đoán nhanh

| Triệu chứng | Kiểm tra |
|---|---|
| App không tải được dữ liệu | Mở `<API_URL>?action=ping` |
| Sai tên/giá sản phẩm, thiếu cột | Mở `<API_URL>?action=schema` |
| Sửa code rồi mà máy không đổi | Chưa bump `?v=` — xem mục Phát triển |
| Màn hình đen | ErrorBoundary sẽ hiện nút Reload kèm thông báo lỗi |
