# VJ·POS — Kiến trúc & quy ước code

## Sơ đồ tổng thể

```
iPhone Safari (GitHub Pages)          Google Cloud
┌──────────────────────────┐         ┌─────────────────────────┐
│ index.html (shop)        │  fetch  │ Apps Script Web App     │
│  └ assets/css/*.css      │ ──────▶ │  doGet  → đọc           │
│  └ assets/js/**/*.js     │ ◀────── │  doPost → ghi (cần PIN) │
└──────────────────────────┘  JSON   └───────────┬─────────────┘
                                                 │
                                     ┌───────────▼─────────────┐
                                     │ Google Sheets (7 sheet) │
                                     └─────────────────────────┘
```

Không có build step. Trình duyệt nạp thẳng file nguồn, React lấy từ CDN dạng UMD,
component viết bằng `React.createElement` (không JSX).

## Frontend — trách nhiệm từng tầng

| Thư mục | Được phép làm | KHÔNG được làm |
|---|---|---|
| `assets/js/config.js` | Hằng số toàn app | Chứa logic |
| `assets/js/lib/` | Hàm thuần: format số, tra cứu icon/màu | Gọi API, đụng React |
| `assets/js/api/` | Duy nhất nơi gọi `fetch` | Chứa quy tắc nghiệp vụ |
| `assets/js/domain/` | Công thức tiền, quản lý draft — hàm thuần | Đụng React hoặc DOM |
| `assets/js/ui/` | Component dùng lại ≥ 2 màn hình | Gọi API trực tiếp |
| `assets/js/screens/` | Dựng giao diện 1 tab | Giữ state của app, tính tiền |
| `assets/js/app.js` | Giữ state, nối dây, gọi API | Viết render dài dòng |

Tất cả gắn vào namespace `window.VJ`. Không dùng ES module để mở bằng `file://` vẫn chạy.

**Thứ tự nạp script trong `pos.html` là bắt buộc:**
`config → lib → api → domain → ui → screens → app`. Đảo thứ tự sẽ trắng màn hình.

## Nơi đặt các thứ hay phải sửa

| Cần sửa gì | Mở file nào |
|---|---|
| Đổi URL API / phí thẻ 3% | [assets/js/config.js](../assets/js/config.js) |
| Thêm brand mới, đổi màu brand, thêm icon loại hàng | [assets/js/lib/catalog.js](../assets/js/lib/catalog.js) |
| Sửa cách tính giảm giá / hoa hồng | [assets/js/domain/totals.js](../assets/js/domain/totals.js) |
| Thêm field cho đơn nháp | [assets/js/domain/drafts.js](../assets/js/domain/drafts.js) → `createEmpty()` |
| Đổi màu / bo góc / font | [assets/css/tokens.css](../assets/css/tokens.css) |
| Sửa khung màn hình, thanh search bị cuộn | [assets/css/layout.css](../assets/css/layout.css) |
| Thêm cột mới trong Sheets | [backend/00_schema.gs](../backend/00_schema.gs) → `SCHEMA` |

## Quy tắc bất di bất dịch

1. **Công thức tiền chỉ được viết một lần** — trong `domain/totals.js`. Hoa hồng hiện trên
   màn hình và hoa hồng ghi vào sheet phải dùng chung `allocateLine()`. Trước đây hai chỗ
   viết riêng, sửa một chỗ quên chỗ kia là lệch tiền thật.
2. **Không set `Content-Type` khi POST.** Apps Script không trả header preflight; thêm vào
   là dính CORS ngay.
3. **POST không được retry.** Gọi lại `submit_order` lần hai sẽ tạo đơn trùng và trừ kho
   hai lần. GET thì retry thoải mái.
4. **Backend đọc/ghi sheet theo TÊN CỘT**, không theo vị trí cột. Luôn qua `_col_()`, và
   luôn kiểm tra `>= 0` trước khi dùng chỉ số trả về.
5. **Mọi thay đổi tồn kho phải ghi 1 dòng `Admin_Stock_Log`.**

## Deploy

**Frontend:** commit lên `main` → GitHub Pages tự deploy (1–2 phút).
Nhớ bump `BUILD_VERSION` trong `config.js` VÀ tất cả `?v=` trong `index.html` + `pos.html` (Find & Replace),
nếu không iPhone sẽ dùng file cũ trong cache.

**Backend:** xem [backend/README.md](../backend/README.md).

Frontend và backend deploy độc lập được — client tự lùi về cách gọi cũ nếu backend chưa cập nhật
(xem hàm `login()` trong `api/client.js`).
