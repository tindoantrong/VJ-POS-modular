---
name: vjpos-deploy
description: Đẩy code backend/ của VJ-POS lên Google Apps Script và deploy web app bằng clasp, thay cho việc mở editor dán tay 11 file. Gồm kiểm tra môi trường, push, deploy giữ nguyên URL, ghi URL vào config.js. Dùng khi user nói "đưa file backend lên", "push code lên Apps Script", "deploy backend", "cập nhật API", "sao code trên sheet chưa đổi".
---

# vjpos-deploy

Đồng bộ `backend/*.gs` từ repo lên Apps Script project, rồi deploy thành web app.
Bỏ hẳn cảnh mở editor tạo 11 file rồi dán từng cái — và quan trọng hơn, **hết cảnh
repo và bản đang chạy trôi lệch nhau** mà không ai biết.

## Làm được / KHÔNG làm được

| ✅ | ❌ |
|---|---|
| Đẩy toàn bộ `.gs` + `appsscript.json` | `clasp login` (phải mở trình duyệt, người dùng tự làm) |
| Deploy **giữ nguyên URL** đang chạy | Tạo Apps Script project gắn với sheet |
| Ghi URL mới vào `config.js` | Bật Apps Script API cho tài khoản |
| Chẩn lỗi clasp ra nguyên nhân thật | |

## Điều kiện tiên quyết

1. `npm install -g @google/clasp`
2. **Bật Apps Script API**: https://script.google.com/home/usersettings → bật
   *Google Apps Script API*
3. `clasp login` — mở trình duyệt, chọn **đúng tài khoản Google sở hữu script**, bấm Allow.
   Token hết hạn sau một thời gian không dùng; lệnh `check` sẽ báo `invalid_grant` khi cần login lại.
4. **Apps Script project phải được tạo TỪ TRONG spreadsheet**
   (mở sheet → Extensions → Apps Script). Script độc lập tạo từ script.google.com sẽ
   không chạy được vì `SpreadsheetApp.getActiveSpreadsheet()` trả về null.

## Các lệnh

```bash
D=.claude/skills/vjpos-deploy/vjpos_deploy.py

python $D init --script-id <ID hoặc URL editor>   # tạo .clasp.json, chạy 1 lần
python $D check                                   # kiểm tra trước khi nghi ngờ gì khác
python $D push                                    # đẩy code lên (chưa đổi bản đang chạy)
python $D deploy                                  # cập nhật deployment, GIỮ NGUYÊN URL
python $D deploy --new                            # ép tạo deployment mới → URL MỚI
python $D url                                     # in URL /exec hiện có
python $D ship                                    # push + deploy + ghi config.js
```

`--script-id` nhận cả ID lẫn nguyên URL editor, tự bóc ID ra.

## Vì sao `deploy` mặc định là cập nhật, không tạo mới

`clasp deploy` tạo deployment **mới** mỗi lần, và mỗi deployment có một URL `/exec` khác nhau.
Nếu cứ tạo mới thì `config.js` vẫn trỏ URL cũ → sửa code xong app vẫn chạy bản cũ, rất khó hiểu.

Nên lệnh `deploy` ở đây mặc định **cập nhật deployment sẵn có**, giữ nguyên URL. Chỉ dùng
`--new` khi thật sự muốn URL khác (ví dụ nghi URL cũ bị lộ).

## push khác deploy chỗ nào

- `push` — đưa code lên project. Bản đang chạy **chưa đổi**.
- `deploy` — chốt code hiện tại thành phiên bản chạy thật.

Sửa code mà chỉ `push` thì API vẫn trả kết quả cũ. Đây là chỗ hay nhầm nhất.

## Thứ tự file

Apps Script chạy code top-level theo thứ tự file, mà `00_schema.gs` khai báo `SS` và
`SCHEMA` nên bắt buộc chạy trước. `init` ghi sẵn `filePushOrder` vào `.clasp.json`.
**Thêm file `.gs` mới thì phải thêm vào danh sách đó**, nếu không thứ tự có thể sai.

## Đọc lỗi

| clasp báo | Nghĩa thật |
|---|---|
| `invalid_grant` | Token hết hạn → `clasp login` |
| `User has not enabled the Apps Script API` | Bật ở script.google.com/home/usersettings, đợi ~1 phút |
| `Invalid script ID` | ID sai — **hoặc token hết hạn nên clasp báo nhầm**. Chạy `check` trước |
| `403` | Đang login bằng tài khoản không có quyền trên script |

`check` đã tự dịch sẵn những lỗi này kèm cách xử lý.

## ⚠️ Bẫy: deploy lần đầu bằng clasp sẽ trả 403

Lần deploy ĐẦU TIÊN của một script mới, dù `appsscript.json` đã khai
`"access": "ANYONE_ANONYMOUS"`, gọi URL `/exec` vẫn nhận **403 "Truy cập bị từ chối"**.

Lý do: script chưa bao giờ được cấp quyền OAuth — chủ script chưa chạy hàm nào trong
editor, nên Google chưa có gì để `Execute as: Me` chạy dưới danh nghĩa. clasp không kích
hoạt được luồng cấp quyền đó vì nó cần người bấm Allow trên trình duyệt.

**Cách gỡ (chỉ làm một lần cho mỗi script):**

1. Mở editor: `clasp open-script` hoặc vào script.google.com
2. Chọn hàm `testSchema` → **Run** → màn cảnh báo "Google hasn't verified this app"
   → Advanced → Go to ... (unsafe) → **Allow**
3. **Deploy → Manage deployments → biểu tượng bút chì → Who has access: Anyone → Deploy**

Bước 3 **giữ nguyên URL** vì đang sửa deployment sẵn có, nên `config.js` không cần đổi.

Từ lần sau `python $D ship` chạy trọn vẹn, không cần đụng UI nữa.

## Sau khi deploy phải kiểm tra

```bash
python .claude/skills/vjpos-sheet/vjpos_sheet.py health
```

Nếu `schema` báo lỗi kiểu `Cannot read properties of null` → script **không gắn với
spreadsheet nào**. Phải tạo lại project từ trong sheet, không cứu được bằng cách push.

## Quy trình đầy đủ cho hệ thống mới

```
1. python .claude/skills/vjpos-sheet/vjpos_sheet.py --sheet <ID> setup
2. python .claude/skills/vjpos-sheet/vjpos_sheet.py --sheet <ID> seed
3. Mở spreadsheet → Extensions → Apps Script → copy script ID trên URL
4. python $D init --script-id <ID>
5. clasp login          ← người dùng tự chạy
6. python $D check      ← phải ra "SẴN SÀNG ĐẨY CODE"
7. python $D ship
8. python .claude/skills/vjpos-sheet/vjpos_sheet.py health
```

Từ lần sau, sửa backend xong chỉ cần `python $D ship`.

## Lưu ý

- `.clasp.json` và `.claspignore` **nằm trong `.gitignore`** — chúng gắn với script project
  và tài khoản của từng người. Máy mới thì chạy lại `init`.
- `~/.clasprc.json` chứa OAuth token, nằm ở thư mục home, **tuyệt đối không đưa vào repo**.
- `.claspignore` chặn `*.md` để `backend/README.md` không bị đẩy lên Apps Script.
