# VJ·POS Backend — Google Apps Script

Code chạy trong Apps Script gắn với Google Sheets. Thư mục này là **bản gốc trong git**;
bản đang chạy thật nằm trong Apps Script editor. Hai bên phải khớp nhau.

## Các file (thứ tự nạp quan trọng)

| File | Nội dung |
|---|---|
| `00_schema.gs` | Hằng số + `SCHEMA`: khai báo tên cột chấp nhận được của từng sheet |
| `10_http.gs` | `doGet`/`doPost`, định tuyến action, helper đóng gói JSON |
| `20_sheets.gs` | Đọc/ghi sheet theo tên cột, khoá/mở khoá sheet |
| `30_auth.gs` | Kiểm tra PIN, tính hoa hồng cho màn chào |
| `40_catalog.gs` | `schema`, `artists`, `staff`, `products` (chỉ đọc) |
| `50_orders.gs` | `orders`, `submit_order`, `void_order`, sinh mã đơn |
| `60_payments.gs` | `add_payment` |
| `70_stock.gs` | Trừ kho, chỉnh kho, nhập kho hàng loạt, ghi log |
| `98_setup.gs` | Dựng 7 sheet cho spreadsheet trống — xem [docs/SETUP.md](../docs/SETUP.md) |
| `99_debug.gs` | Hàm chạy tay để chẩn đoán |

Apps Script chạy code top-level theo thứ tự file trong editor. Tiền tố số giữ đúng thứ tự
đó (`00_schema.gs` khai báo `SS`, `SCHEMA` phải chạy trước). **Đừng đổi tên file.**

## Deploy thủ công (đang dùng)

1. Mở Google Sheet → Extensions → Apps Script
2. Với **từng** file `.gs` ở trên: tạo file cùng tên trong editor, dán đè toàn bộ nội dung
3. Save
4. Deploy → Manage deployments → Edit (bút chì) → Version: **New version** → Deploy
5. Kiểm tra ngay: mở `<API_URL>?action=ping` — phải thấy `{"ok":true,"msg":"pong",...}`
6. Kiểm tra cột: mở `<API_URL>?action=schema` — `issues.missingHeaders` phải rỗng

⚠️ **Không bấm "Deploy → New deployment"** — nó tạo URL mới và app đang chạy sẽ trỏ vào
bản cũ. Luôn dùng **Edit deployment hiện có**.

## Deploy bằng clasp (khuyến nghị)

Deploy tay dễ làm repo và bản chạy thật trôi khác nhau. Dùng `clasp` để đồng bộ hai chiều:

```bash
npm install -g @google/clasp
clasp login
cd backend
clasp clone <SCRIPT_ID>   # lần đầu, hoặc tạo .clasp.json trỏ tới script sẵn có
clasp push                # đẩy code lên
clasp pull                # kéo về nếu ai đó sửa trực tiếp trên web
clasp deploy -i <DEPLOYMENT_ID> -d "mô tả"
```

`<SCRIPT_ID>` lấy trong URL của Apps Script editor.
`.clasp.json` chứa id, không chứa bí mật, commit được.

## Endpoint

**GET** `?action=...`

| action | Trả về |
|---|---|
| `ping` | Kiểm tra sống |
| `schema` | Báo cáo sheet/cột thiếu — dùng khi app báo lỗi cột |
| `products` | Danh mục hàng kèm tồn kho và tỉ lệ hoa hồng |
| `staff` | Nhân viên đang active (không kèm PIN) |
| `artists` | Brand và tỉ lệ hoa hồng |
| `orders` | 100 đơn gần nhất kèm items và payments |
| `login&pin=XXXX` | Giữ để tương thích ngược; frontend mới dùng POST |

**POST** (body JSON thô, **không set Content-Type**), mọi action đều cần `pin` hợp lệ:

`login` · `submit_order` · `add_payment` · `void_order` · `update_stock` · `bulk_import`

`void_order` và `bulk_import` yêu cầu `role = manager`.

Response luôn là JSON, kể cả khi lỗi: `{ok: false, error: "...", reqId: "..."}`.
`reqId` dùng để dò trong Executions log của Apps Script.
