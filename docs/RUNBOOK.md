# RUNBOOK — dựng VJ-POS từ số 0

Ghi lại từ lần dựng thật ngày **2026-08-20** (spreadsheet `BanGaoGayQuy`). Lần đó mất
khá nhiều thời gian vì vướng 6 cái bẫy — **tất cả đều đã ghi ở mục "Bẫy" bên dưới**.
Làm đúng thứ tự này thì mất khoảng 15 phút.

---

## Đường nhanh (đã có service account + clasp)

```bash
S=.claude/skills/vjpos-sheet/vjpos_sheet.py
D=.claude/skills/vjpos-deploy/vjpos_deploy.py
ID=<spreadsheet id>          # lấy trong URL sheet
SCRIPT=<script id>           # lấy trong URL editor Apps Script

# 1. Dựng database
python $S setup  --sheet $ID       # tạo 9 sheet + ép định dạng cột nhạy cảm
python $S seed   --sheet $ID       # dữ liệu mồi: 1 quản lý, 4 brand, 4 sản phẩm
python $S verify --sheet $ID       # phải ra "SẴN SÀNG"

# 2. Đẩy backend
python $D init --script-id $SCRIPT
python $D check                    # phải ra "ĐỌC ĐƯỢC PROJECT"
python $D ship                     # push 12 file + deploy + ghi URL vào config.js

# 3. Kiểm tra
python $S health                   # phải ra "TẤT CẢ BÌNH THƯỜNG"
python $S orders --sheet $ID       # xem đơn khách đặt
```

## Việc BẮT BUỘC làm tay (không tự động hoá được)

| Việc | Vì sao không tự động được |
|---|---|
| Tạo spreadsheet | — (sheets.new, 5 giây) |
| Share sheet cho service account, quyền **Editor** | Cần chủ sở hữu bấm |
| **Tạo Apps Script TỪ TRONG sheet** (Extensions → Apps Script) | Google không có API tạo script gắn với sheet |
| `clasp login` | Luồng OAuth trên trình duyệt |
| Bật **Google Apps Script API** | Công tắc ở script.google.com/home/usersettings |
| **Chạy 1 hàm trong editor để cấp quyền** | Màn hình đồng ý OAuth, phải bấm Allow |
| Deploy lần đầu: Who has access = **Anyone** | Xem bẫy #4 |

---

# 6 CÁI BẪY ĐÃ GẶP

## Bẫy 1 — clasp báo "Invalid script ID" nhưng ID hoàn toàn đúng

Nguyên nhân thật: **refresh token hết hạn**. clasp báo sai chỗ, dẫn đi mò nhầm hướng.

```bash
clasp login
```

Nhận diện: `python $D check` sẽ hiện `invalid_grant` — đó mới là lỗi thật.

## Bẫy 2 — `check` báo sẵn sàng rồi `push` chết ngay

`clasp list-deployments` chạy được **kể cả khi Apps Script API đang tắt**, vì nó đi
đường khác. Đọc được project cũng không đủ: **đọc và ghi là hai nhánh quyền tách nhau**,
`clasp pull` chạy ngon mà `clasp push` vẫn bị chặn.

→ Bật ở https://script.google.com/home/usersettings, đợi ~1 phút.

Vì thế `check` **cố tình không** khẳng định "sẵn sàng" — chỉ chính lệnh `push` mới
xác nhận được quyền ghi, mà thử ghi để kiểm tra thì phá nội dung project.

## Bẫy 3 — script độc lập không đọc được spreadsheet

Apps Script tạo từ script.google.com là **script độc lập**,
`SpreadsheetApp.getActiveSpreadsheet()` trả `null` → mọi endpoint hỏng.

**Bắt buộc tạo từ trong sheet**: mở spreadsheet → Extensions → Apps Script.

Nhận diện: `health` báo `schema` lỗi kiểu `Cannot read properties of null`.
Push bao nhiêu lần cũng vô ích, phải tạo lại project.

## Bẫy 4 — deploy lần đầu bằng clasp luôn trả 403

Gọi `/exec` nhận **403 "Truy cập bị từ chối"** dù `appsscript.json` đã khai đúng
`"access": "ANYONE_ANONYMOUS"` (đã pull về kiểm chứng manifest trên server đúng y nguyên).

Lý do: script **chưa bao giờ được cấp quyền OAuth**. `Execute as: Me` cần chủ script
bấm Allow một lần, mà clasp không kích hoạt được luồng đó.

**Gỡ (một lần cho mỗi script):**

1. `clasp open-script`
2. Chọn hàm `testSchema` → **Run** → "Google hasn't verified this app" → Advanced →
   Go to ... (unsafe) → **Allow**
3. **Deploy → Manage deployments → bút chì → Who has access: `Anyone` → Deploy**

Bước 3 sửa deployment sẵn có nên **giữ nguyên URL**, `config.js` không phải đổi.
Từ lần sau `python $D ship` chạy trọn vẹn, không cần đụng UI.

## Bẫy 5 — số điện thoại mất số 0 đầu

`0912345678` lưu vào sheet thành `912345678`. Nhân viên gọi là gọi sai số.
PIN `0123` thành `123` thì không đăng nhập được, mà nhìn sheet vẫn tưởng đúng.

**Đặt định dạng cột thành "Text" là KHÔNG đủ** — đã thử và vẫn hỏng. Định dạng chỉ đổi
cách *hiển thị*, còn lúc ghi thì Sheets đã ép chuỗi thành số rồi, số 0 mất khỏi chính
giá trị lưu xuống.

Thuốc đúng là `_asText_()` trong `backend/20_sheets.gs` — thêm dấu nháy đơn đầu chuỗi,
ký hiệu "bắt buộc là chữ" của Sheets. Đã áp cho `customer_phone` ở cả đơn POS lẫn đơn web.

Bằng chứng từ lần dựng thật:

| Đơn | Ghi lúc | Giá trị thật trong ô |
|---|---|---|
| DH-0001 | sửa tay | `'0912345678'` chuỗi |
| DH-0002 | *sau khi* format cột TEXT | `987654321` số — **vẫn hỏng** |
| DH-0003 | sau khi có `_asText_` | `'0338111222'` chuỗi ✅ |

Định dạng cột vẫn giữ, nhưng cho mục đích khác: để người gõ tay PIN vào sheet không bị mất số 0.

## Bẫy 6 — công cụ xem đơn hiện sai số điện thoại

Cái này lừa mất mấy vòng: dữ liệu trong sheet **đúng**, nhưng `orders` in ra vẫn mất số 0.

`gspread.get_all_records()` mặc định tự đổi chuỗi trông giống số thành số nguyên.
Phải truyền `numericise_ignore=["all"]`.

→ **Bài học: khi nghi backend hỏng, kiểm tra công cụ đọc trước.** Soi thẳng ô bằng
`value_render_option` mới là bằng chứng đáng tin.

---

# Sau khi chạy

## Sửa backend

```bash
python $D ship        # push + deploy + ghi config.js
python $S health
```

`push` chỉ đưa code lên, **bản đang chạy chưa đổi** — phải `deploy` mới chốt.
`deploy` mặc định **cập nhật deployment sẵn có, giữ nguyên URL**; `--new` mới sinh URL mới.

## Sửa frontend

Commit lên `main` → GitHub Pages tự deploy. **Nhớ bump `?v=`** trong `index.html` và
`pos.html` cho khớp `BUILD_VERSION`, không thì iPhone dùng bản cache cũ.

## Đổi giá gạo

Sửa `SHOP_CATALOG` trong `backend/80_shop.gs` → `python $D ship`. Không cần đụng frontend.

## Thêm file .gs mới

Phải thêm vào `filePushOrder` trong `.clasp.json`, không thì thứ tự nạp có thể sai
(`00_schema.gs` khai báo `SS` và `SCHEMA`, bắt buộc chạy trước).

---

# Test trước khi deploy

```bash
python tests/live_api_test.py          # 48 ca, chạy trên API + sheet THẬT
python tests/live_api_cleanup.py       # xem trước sẽ dọn gì
python tests/live_api_cleanup.py --yes # dọn thật, đưa sheet về trạng thái sau seed
```

⚠️ Test **ghi dữ liệu thật** (đơn hàng, tồn kho, nhật ký kho). Chỉ chạy trên spreadsheet
dùng để thử, đừng chạy trên sheet đang bán hàng.

Sáu nhóm ca:

| Nhóm | Nội dung |
|---|---|
| A | Chống gian lận endpoint public: bịa giá, sản phẩm lạ, vượt trần, honeypot, chặn tần suất, mốc miễn ship |
| B | Đăng nhập POS, PIN sai, không lộ PIN và giá vốn ra API |
| C | Vòng đời đơn: bán → trừ kho → thu tiền từng phần → PAID → huỷ → hoàn kho |
| D | Bán quá tồn kho, dịch vụ, hàng đặt riêng, phân quyền staff/manager |
| E | Nhập kho hàng loạt, hàng mới hiện đúng tên |
| F | ping, schema, action lạ, PIN sai không ghi được |

Kết quả lần chạy 2026-08-20: **48/48 PASS**.

Ngoài ra đã kiểm tay trên trình duyệt với backend thật:

- Trang shop: đặt hàng đủ luồng, số tiền trên màn hình khớp số server trả về
- POS: đăng nhập PIN → nạp danh mục → bán 2 món, giảm giá bill 10%, phí thẻ 3%
  → đối chiếu **11 chỉ số** giữa màn hình và sheet, khớp từng đồng kể cả hoa hồng 76.500đ

---

# Trạng thái lần dựng 2026-08-20

```
Spreadsheet : BanGaoGayQuy  (tindoantrong@gmail.com)
              1mUAY1z3vJnMajdCMBO8y3OFS_ZdQ5V47ENl_tTiMqNU
Service acc : sheets-writer@sun-2026-491203.iam.gserviceaccount.com  (Editor)
Script      : 1-MZeOVgLYBPPAd_BqSDpVQ4HcGRgAx3Kr6hQyFgA99yjD4dl9kQGtAv5
API version : 2.3.0
Sheet       : 9 sheet, verify SẴN SÀNG
Health      : ping OK · schema OK · shop_products OK (2 sản phẩm / 4 quy cách)
Đơn test    : DH-0001, DH-0002, DH-0003 — xoá được, chỉ là dữ liệu thử
PIN         : S001 / 1234 (giữ mặc định theo yêu cầu)
```

> PIN mặc định chặn các lệnh **ghi** của POS (`submit_order`, `void_order`, `bulk_import`).
> Trang bán gạo cho khách không ảnh hưởng — nó dùng `customer_order` không cần PIN.
> Muốn siết thì sửa một ô trong `Admin_Staff`, không phải deploy lại.
