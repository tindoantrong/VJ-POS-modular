# Dựng hệ thống VJ·POS của riêng bạn từ con số 0

Hướng dẫn tạo spreadsheet mới hoàn toàn, không dính dáng gì tới dữ liệu của người khác.
Làm hết mất khoảng 15 phút.

## Hiểu mô hình trước đã

```
Google Spreadsheet ──gắn vào──▶ Apps Script ──Deploy──▶ URL .../exec
   (chính là DB)                 (backend)                 (chính là API)
                                                                │
                                            assets/js/config.js ◀── dán URL vào đây
```

Ba điều quyết định mọi thứ:

1. **Spreadsheet chính là database.** Không có server nào khác. Mỗi sheet là một bảng.
2. **Apps Script phải được tạo TỪ BÊN TRONG spreadsheet** (Extensions → Apps Script).
   Code dùng `SpreadsheetApp.getActiveSpreadsheet()` — nó chỉ đọc/ghi đúng cái spreadsheet
   nó được gắn vào, không bao giờ chạm tới file khác. Script tạo rời sẽ không chạy được.
3. **URL `/exec` sinh ra khi Deploy chính là API.** Đổi URL trong `config.js` nghĩa là
   trỏ app sang một spreadsheet hoàn toàn khác. Đó là toàn bộ việc "đổi database".

Suy ra: sheet mới → script gắn vào sheet mới → deploy lấy URL mới → dán vào `config.js`.
Sheet cũ của tác giả không bị ảnh hưởng gì, và bạn cũng không cần quyền truy cập nó.

---

## Bước 1 — Tạo spreadsheet trống

1. Vào https://sheets.new
2. Đặt tên, ví dụ `VJ-POS Database`
3. Để nguyên sheet trống, không cần tạo cột gì cả — bước 3 sẽ tự dựng

## Bước 2 — Dán code backend

1. Trong spreadsheet vừa tạo: **Extensions → Apps Script**
2. Đổi tên project (góc trên trái), ví dụ `VJ-POS Backend`
3. Xoá file `Code.gs` mặc định
4. Tạo lần lượt **10 file** dưới đây (nút `+` → Script), **đúng tên, đúng thứ tự**, rồi dán
   nội dung tương ứng từ thư mục `backend/` của repo này:

   ```
   00_schema     10_http     20_sheets     30_auth     40_catalog
   50_orders     60_payments 70_stock      98_setup    99_debug
   ```

   > Apps Script chạy code top-level theo thứ tự file. `00_schema` khai báo `SS` và `SCHEMA`
   > nên bắt buộc phải đứng đầu. Editor tự thêm đuôi `.gs`, bạn chỉ cần gõ phần tên.

5. Vào **Project Settings** (bánh răng) → tích **"Show appsscript.json manifest file"**
   → quay lại editor, mở `appsscript.json`, dán nội dung từ `backend/appsscript.json`
6. **Save** (Ctrl+S)

## Bước 3 — Dựng cấu trúc 7 sheet

Vẫn trong Apps Script editor:

1. Ở thanh chọn hàm phía trên, chọn **`setupNewSpreadsheet`** → bấm **Run**
2. Lần đầu chạy sẽ hiện xin quyền: **Review permissions** → chọn tài khoản Google của bạn →
   màn hình "Google hasn't verified this app" → **Advanced** → **Go to VJ-POS Backend (unsafe)**
   → **Allow**

   > Cảnh báo này là bình thường: script do chính bạn viết nên Google chưa xác minh. Nó chỉ
   > xin quyền truy cập spreadsheet mà nó gắn vào.

3. Chạy tiếp **`seedStarterData`** → tạo sẵn 1 tài khoản quản lý và vài sản phẩm mẫu để
   thử ngay
4. Chạy **`verifySetup`** → xem **Execution log**. Phải thấy `"ok": true`.
   Nếu `ok: false` thì log liệt kê rõ thiếu sheet nào / cột nào.

Quay lại spreadsheet, bạn sẽ thấy 7 sheet:

| Sheet | Nội dung |
|---|---|
| `Admin_Staff` | Nhân viên + PIN đăng nhập |
| `Admin_Products` | Danh mục hàng + tồn kho |
| `Admin_Artists` | Brand + tỉ lệ hoa hồng |
| `Orders` | Đơn hàng |
| `Order_Items` | Từng dòng hàng trong đơn |
| `Payments` | Các lần thu tiền |
| `Admin_Stock_Log` | Nhật ký biến động kho |

Chi tiết ý nghĩa từng cột: [SHEETS.md](SHEETS.md).

## Bước 4 — 🔴 Đổi PIN ngay

`seedStarterData` tạo tài khoản `S001` / PIN **1234**. Mở sheet `Admin_Staff`, sửa cột
`pin` thành số khác, sửa `name` thành tên thật.

Thêm nhân viên = thêm dòng mới:

| staff_id | name | role | active | pin |
|---|---|---|---|---|
| S001 | Mai | `manager` | TRUE | 4821 |
| S002 | Lan | `staff` | TRUE | 7395 |

`role = manager` mới được huỷ đơn và nhập kho hàng loạt. `active = FALSE` là khoá đăng nhập.

## Bước 5 — Deploy lấy URL API

Trong Apps Script editor:

1. **Deploy → New deployment**
2. Bánh răng cạnh "Select type" → **Web app**
3. Điền:
   - Description: `v1`
   - **Execute as: Me** ← bắt buộc, để script có quyền ghi vào sheet của bạn
   - **Who has access: Anyone** ← bắt buộc, vì app chạy trên trình duyệt khách không đăng nhập Google
4. **Deploy** → copy **Web app URL**, dạng:
   `https://script.google.com/macros/s/AKfycb.../exec`

Kiểm tra ngay bằng cách mở URL đó trên trình duyệt, thêm `?action=ping`:

```
https://script.google.com/macros/s/AKfycb.../exec?action=ping
```

Phải trả về `{"ok":true,"msg":"pong",...}`. Nếu ra trang đăng nhập Google → bạn đặt sai
"Who has access", sửa lại thành **Anyone**.

Kiểm tra tiếp `?action=schema` → `issues.missingHeaders` phải rỗng.

## Bước 6 — Trỏ app sang spreadsheet mới

Mở [assets/js/config.js](../assets/js/config.js), thay giá trị `API`:

```js
VJ.config = {
  API: "https://script.google.com/macros/s/URL_CỦA_BẠN/exec",
  ...
};
```

Xong. Mở app, đăng nhập bằng PIN vừa đặt.

---

## Từ nay về sau

**Sửa backend:** sửa file trong `backend/` của repo → dán đè file tương ứng trong Apps Script
→ Save → **Deploy → Manage deployments → Edit (bút chì) → Version: New version → Deploy**.

> ⚠️ Đừng bấm "New deployment" khi cập nhật — nó sinh URL mới và app vẫn chạy bản cũ.
> Chỉ "New deployment" đúng một lần ở Bước 5.

Làm tay dễ khiến repo và bản chạy thật trôi lệch nhau. Dùng `clasp` để đồng bộ hai chiều —
xem [backend/README.md](../backend/README.md).

**Nhập hàng thật:** dùng tab Admin trong app (dán từ spreadsheet, mỗi dòng
`product_id, số_lượng_thêm, [giá], [tên], [loại], [brand]`), hoặc gõ thẳng vào sheet
`Admin_Products`. Nhớ `active = TRUE` thì hàng mới hiện trong app.

**Thêm brand mới:** thêm dòng vào `Admin_Artists` (cột `commission_rate_to_staff` là số thập
phân, `0.05` = 5%), rồi thêm mã màu cho brand đó trong
[assets/js/lib/catalog.js](../assets/js/lib/catalog.js). Không thêm màu thì brand hiện màu xám mặc định.

---

## Cảnh báo bảo mật cần biết

Deployment đặt **"Who has access: Anyone"** nghĩa là **bất kỳ ai có URL đều gọi được các
endpoint chỉ đọc** — `?action=products`, `?action=orders`, `?action=staff` — tức là xem được
danh mục hàng, toàn bộ đơn hàng kèm **tên và số điện thoại khách**. Ghi dữ liệu thì vẫn cần PIN.

URL này nằm trong `config.js` được trình duyệt tải về, nên **không thể giấu** ở kiến trúc hiện
tại. Nếu cần siết:

- Bắt buộc PIN cho cả `orders` (nhưng khi đó phải sửa luồng nạp dữ liệu ban đầu của frontend)
- Hoặc bỏ `customer_phone` khỏi phần `getOrders` trả về
- Đổi URL deployment định kỳ (tạo deployment mới) nếu nghi bị lộ

## Gỡ rối

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| `?action=ping` ra trang đăng nhập Google | "Who has access" chưa đặt Anyone |
| `Missing sheet: Admin_Products` | Chưa chạy `setupNewSpreadsheet` |
| `Invalid PIN` dù gõ đúng | Cột `active` đang FALSE, hoặc PIN trong sheet lưu dạng số bị mất số 0 đầu — format cột `pin` thành **Plain text** |
| App hiện tên sản phẩm sai | Sai cột — chạy `?action=schema` xem `detectedHeaders` |
| Sửa code rồi mà app không đổi | Chưa "New version" khi deploy, hoặc chưa bump `?v=` trong index.html |
| Đơn ghi được nhưng kho không trừ | Sản phẩm có `loai_hang` nằm trong danh sách dịch vụ (`SERVICE_TYPES`) |
