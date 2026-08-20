---
name: vjpos-sheet
description: Dựng và kiểm tra Google Spreadsheet làm database cho VJ-POS — tạo 9 sheet kèm header chuẩn, nạp dữ liệu mồi, đối chiếu cấu trúc, xem đơn hàng, kiểm tra API đã deploy, ghi URL API vào config.js. Dùng khi user nói "dựng sheet cho POS", "tạo spreadsheet mới", "kiểm tra sheet đúng chưa", "xem đơn khách đặt", "API còn sống không", "đổi URL API".
---

# vjpos-sheet

Thao tác trực tiếp lên Google Spreadsheet của VJ-POS bằng **service account**, không phải
qua Apps Script. Dùng để dựng database mới và kiểm tra về sau.

## Làm được gì / KHÔNG làm được gì

| | |
|---|---|
| ✅ Tạo 9 sheet kèm đúng header, đóng băng dòng 1 | ❌ Tạo project Apps Script |
| ✅ Nạp dữ liệu mồi để đăng nhập thử ngay | ❌ Dán code `.gs` vào editor |
| ✅ Đối chiếu sheet thật với định nghĩa trong repo | ❌ Bấm nút Deploy |
| ✅ Đọc đơn POS và đơn web | |
| ✅ Gọi API kiểm tra sức khoẻ | |

**Phần Apps Script vẫn phải làm tay** — Google không cho tự động hoá việc tạo script gắn
với sheet và deploy web app. Muốn tự động phần đó thì dùng `clasp`, xem `backend/README.md`.

## Nguồn sự thật duy nhất

Script **đọc `SHEET_TEMPLATES` từ `backend/98_setup.gs`**, không chép lại định nghĩa cột.
Nhờ vậy hai đường dựng sheet luôn ra cùng một kết quả:

- Chạy `setupNewSpreadsheet()` trong Apps Script — ai cũng làm được, không cần cài gì
- Chạy skill này — nhanh hơn, nhưng cần service account

Sửa cột thì sửa `98_setup.gs`, cả hai đường tự theo.

## Điều kiện tiên quyết

1. `pip install gspread`
2. File key service account. Mặc định:
   `F:/wampp/www/nbk2020_8/user_config/sheets-writer-key.json`
   (đổi bằng `--key` hoặc biến môi trường `VJPOS_SA_KEY`)
3. **Spreadsheet đã share cho email của service account với quyền Editor.**
   Lấy email: `python -c "import json;print(json.load(open(KEY))['client_email'])"`
   Chưa share thì script báo rõ và in sẵn email cần thêm.

`--sheet` là ID trong URL:
`docs.google.com/spreadsheets/d/`**`<ID Ở ĐÂY>`**`/edit`

## Các lệnh

```bash
S=.claude/skills/vjpos-sheet/vjpos_sheet.py
ID=1mUAY1z3vJnMajdCMBO8y3OFS_ZdQ5V47ENl_tTiMqNU

python $S --sheet $ID setup      # tạo sheet còn thiếu kèm header
python $S --sheet $ID seed       # nạp dữ liệu mồi vào sheet đang trống
python $S --sheet $ID verify     # đối chiếu với 98_setup.gs, báo thiếu gì
python $S --sheet $ID orders     # 15 đơn web gần nhất
python $S --sheet $ID orders --pos --limit 30
python $S health                 # gọi API lấy từ config.js
python $S health --url https://script.google.com/.../exec
python $S set-api --url https://script.google.com/.../exec
```

`setup` và `seed` **an toàn khi chạy lại nhiều lần**: sheet đã có thì bỏ qua, sheet đã có
dữ liệu thì không ghi đè. Không có lệnh nào xoá dữ liệu (trừ việc dọn tab `Sheet1` mặc
định lúc còn hoàn toàn trống).

## Quy trình dựng hệ thống mới

```
1. sheets.new → tạo spreadsheet trống
2. Share cho service account, quyền Editor
3. python $S --sheet <ID> setup
4. python $S --sheet <ID> seed
5. python $S --sheet <ID> verify        ← phải ra "SẴN SÀNG"
6. Đổi PIN mặc định 1234 trong sheet Admin_Staff
   ── từ đây phải làm tay ──
7. Sheet → Extensions → Apps Script → dán 11 file từ backend/ (đúng tên, đúng thứ tự số)
   + bật hiện appsscript.json rồi dán nốt
8. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone → copy URL
9. python $S set-api --url <URL>
10. python $S health                     ← phải ra "TẤT CẢ BÌNH THƯỜNG"
```

Bước 7–8 chi tiết ở `docs/SETUP.md`.

## Đọc kết quả `health`

| Dòng | Nghĩa |
|---|---|
| `HỎNG ping` | URL sai, hoặc "Who has access" chưa đặt Anyone |
| `HỎNG schema — thiếu:` | Sheet thiếu cột. Chạy `setup` rồi Deploy lại bản mới |
| `HỎNG shop_products` | Backend chưa deploy `80_shop.gs` |
| `version` thấp hơn `API_VERSION` trong `00_schema.gs` | Bản đang chạy cũ hơn code trong repo — Deploy lại |

## Lưu ý

- Service account chỉ dùng cho **thao tác quản trị từ máy dev**. App chạy thật không dùng
  nó — Apps Script chạy dưới danh tính người deploy (`Execute as: Me`). Hai đường khác nhau.
- File key **không được commit**. Nó nằm ngoài repo (`nbk2020_8/user_config/`).
- `verify` cảnh báo nếu còn tài khoản dùng PIN mặc định `1234`.
- `orders` mặc định đọc `Shop_Orders` (đơn khách đặt trên web). Thêm `--pos` để xem
  `Orders` (đơn bán tại tiệm). Hai loại này cố ý tách nhau, xem `docs/SHOP.md`.
