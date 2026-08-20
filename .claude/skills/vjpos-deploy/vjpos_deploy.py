#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
vjpos_deploy.py — đẩy code backend/ lên Google Apps Script và deploy web app, bằng clasp.

Thay cho việc mở editor dán tay 11 file. Một lệnh `push` là xong.

GIỚI HẠN THẬT: `clasp login` phải do người dùng tự chạy (mở trình duyệt, đồng ý quyền
Google). Script không làm hộ được. Mọi thứ sau đó thì tự động.

Lệnh:
  check    kiểm tra clasp, đăng nhập, cấu hình — chạy cái này trước khi hỏi vì sao lỗi
  init     tạo .clasp.json + .claspignore trỏ tới script project
  push     đẩy toàn bộ backend/*.gs + appsscript.json lên
  deploy   tạo deployment lần đầu, hoặc CẬP NHẬT deployment sẵn có (không sinh URL mới)
  url      in URL /exec hiện tại
  ship     làm liền mạch: push -> deploy -> ghi URL vào config.js
"""
import argparse, json, os, re, subprocess, sys

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
BACKEND = os.path.join(REPO, "backend")
CLASP_JSON = os.path.join(REPO, ".clasp.json")
CLASPIGNORE = os.path.join(REPO, ".claspignore")
CONFIG_JS = os.path.join(REPO, "assets", "js", "config.js")


def say(s=""):
    print(s)


def die(msg, hint=None):
    say("LỖI: " + msg)
    if hint:
        say()
        say(hint)
    sys.exit(1)


def run(args, timeout=180, cwd=None):
    """Chạy clasp, trả (mã thoát, output gộp cả stdout lẫn stderr)."""
    try:
        p = subprocess.run(args, cwd=cwd or REPO, capture_output=True, timeout=timeout,
                           shell=(os.name == "nt"))
    except subprocess.TimeoutExpired:
        return 124, "Quá thời gian chờ (%ds)" % timeout
    except FileNotFoundError:
        return 127, "Không tìm thấy lệnh: %s" % args[0]
    out = (p.stdout or b"").decode("utf-8", "replace") + (p.returncode and (p.stderr or b"").decode("utf-8", "replace") or (p.stderr or b"").decode("utf-8", "replace"))
    return p.returncode, out.strip()


# Ánh xạ lỗi khó hiểu của clasp sang nguyên nhân thật
ERROR_HINTS = [
    ("invalid_grant",
     "Token đăng nhập đã hết hạn.\n"
     "  → Chạy:  clasp login\n"
     "     Nó mở trình duyệt, bạn chọn tài khoản Google SỞ HỮU script rồi bấm Allow."),
    ("User has not enabled the Apps Script API",
     "Chưa bật Apps Script API cho tài khoản.\n"
     "  → Mở https://script.google.com/home/usersettings → bật 'Google Apps Script API'\n"
     "     Đợi khoảng 1 phút rồi chạy lại."),
    ("Invalid script ID",
     "Script ID sai, hoặc token hết hạn nên clasp báo nhầm.\n"
     "  → Chạy lệnh 'check' để xem đăng nhập còn hiệu lực không.\n"
     "     ID lấy trong URL: script.google.com/home/projects/<ID Ở ĐÂY>/edit"),
    ("Request failed with status code 403",
     "Tài khoản đang đăng nhập không có quyền trên script này.\n"
     "  → clasp login lại bằng đúng tài khoản sở hữu script."),
    ("Request failed with status code 404",
     "Không tìm thấy script. Kiểm tra lại script ID."),
]


def explain(output):
    for needle, hint in ERROR_HINTS:
        if needle.lower() in output.lower():
            return hint
    return None


def read_clasp_json():
    if not os.path.exists(CLASP_JSON):
        return None
    try:
        return json.load(open(CLASP_JSON, encoding="utf-8"))
    except Exception:
        return None


# ══════════════════════════════════════════════════════════════
def cmd_check(args):
    ok = True
    say("KIỂM TRA MÔI TRƯỜNG\n")

    code, out = run(["clasp", "--version"], timeout=60)
    if code:
        say("  THIẾU   clasp chưa cài")
        say("          → npm install -g @google/clasp")
        ok = False
    else:
        say("  OK      clasp %s" % out.splitlines()[0].strip())

    cj = read_clasp_json()
    if not cj:
        say("  THIẾU   .clasp.json — chạy: init --script-id <ID>")
        ok = False
    else:
        say("  OK      .clasp.json → script %s" % cj.get("scriptId", "?")[:20] + "...")
        say("          thư mục nguồn: %s" % cj.get("rootDir", "?"))

    # Thử một lệnh cần quyền thật để biết token còn sống không
    if cj:
        code, out = run(["clasp", "list-deployments"], timeout=120)
        if code == 0:
            n = len([l for l in out.splitlines() if "-" in l and "Deployment" not in l])
            say("  OK      đăng nhập còn hiệu lực (%d deployment)" % max(0, n))
        else:
            say("  HỎNG    không gọi được API Apps Script")
            hint = explain(out)
            say("          %s" % (out.splitlines()[0] if out else "")[:100])
            if hint:
                say()
                for line in hint.splitlines():
                    say("          " + line)
            ok = False

    say()
    say("SẴN SÀNG ĐẨY CODE" if ok else "CHƯA SẴN SÀNG — xử lý mục HỎNG/THIẾU ở trên")
    sys.exit(0 if ok else 1)


def cmd_init(args):
    sid = args.script_id
    if not sid:
        die("Thiếu --script-id",
            "Lấy trong URL editor:\n"
            "  script.google.com/u/0/home/projects/<ID Ở ĐÂY>/edit")
    # Cho phép dán nguyên URL
    m = re.search(r"projects/([A-Za-z0-9_-]{20,})", sid)
    if m:
        sid = m.group(1)

    if not os.path.isdir(BACKEND):
        die("Không thấy thư mục backend/ tại %s" % BACKEND)

    # rootDir = backend/ để clasp chỉ đẩy code Apps Script, không đẩy cả repo
    cfg = {
        "scriptId": sid,
        "rootDir": "backend",
        # Apps Script chạy code top-level theo thứ tự file. Tiền tố số đã đúng thứ tự
        # nhưng khai báo tường minh cho chắc, phòng khi clasp đổi cách sắp xếp.
        "filePushOrder": [
            "backend/00_schema.gs", "backend/10_http.gs", "backend/20_sheets.gs",
            "backend/30_auth.gs", "backend/40_catalog.gs", "backend/50_orders.gs",
            "backend/60_payments.gs", "backend/70_stock.gs", "backend/80_shop.gs",
            "backend/98_setup.gs", "backend/99_debug.gs",
        ],
    }
    open(CLASP_JSON, "w", encoding="utf-8", newline="").write(json.dumps(cfg, indent=2) + "\n")

    # README.md trong backend/ là tài liệu cho người, đừng đẩy lên Apps Script
    open(CLASPIGNORE, "w", encoding="utf-8", newline="").write(
        "# Không đẩy tài liệu lên Apps Script\n**/README.md\n**/*.md\n")

    say("Đã tạo .clasp.json:")
    say("  script  : %s" % sid)
    say("  nguồn   : backend/")
    say("  thứ tự  : 00_schema → ... → 99_debug (Apps Script phụ thuộc thứ tự này)")
    say()
    say("Hai file này đã nằm trong .gitignore — chúng gắn với tài khoản của bạn, không commit.")
    say()
    say("Bước tiếp: check, rồi push")


def cmd_push(args):
    if not read_clasp_json():
        die("Chưa có .clasp.json", "Chạy trước:  init --script-id <ID>")

    files = sorted(f for f in os.listdir(BACKEND) if f.endswith(".gs"))
    say("Đẩy %d file .gs + appsscript.json lên Apps Script..." % len(files))
    for f in files:
        say("  " + f)
    say()

    code, out = run(["clasp", "push", "--force"], timeout=300)
    say(out[:1500] if out else "(không có output)")
    if code:
        hint = explain(out)
        say()
        die("clasp push thất bại", hint)

    say()
    say("ĐẨY XONG. Code trên Apps Script giờ khớp với backend/ trong repo.")
    say("Nhưng bản ĐANG CHẠY vẫn là bản cũ cho tới khi deploy — chạy tiếp: deploy")


def _deployments():
    """Trả list (deploymentId, mô tả). Bỏ qua deployment @HEAD (bản nháp)."""
    code, out = run(["clasp", "list-deployments"], timeout=120)
    if code:
        return None, out
    items = []
    for line in out.splitlines():
        m = re.match(r"^-\s*([A-Za-z0-9_-]{20,})\s*(.*)$", line.strip())
        if m:
            did, rest = m.group(1), m.group(2)
            if "@HEAD" in rest:      # bản nháp, không phải bản chạy thật
                continue
            items.append((did, rest.strip()))
    return items, out


def cmd_deploy(args):
    if not read_clasp_json():
        die("Chưa có .clasp.json", "Chạy trước:  init --script-id <ID>")

    items, raw = _deployments()
    if items is None:
        die("Không đọc được danh sách deployment", explain(raw))

    desc = args.desc or "vjpos"

    if items and not args.new:
        # CẬP NHẬT deployment sẵn có — giữ nguyên URL. Tạo mới sẽ sinh URL khác và
        # app đang chạy vẫn trỏ vào bản cũ.
        did = items[-1][0]
        say("Cập nhật deployment sẵn có %s (giữ nguyên URL)..." % did[:16] + "...")
        code, out = run(["clasp", "redeploy", did, "--description", desc], timeout=300)
    else:
        if items and args.new:
            say("⚠️  Tạo deployment MỚI → sinh URL MỚI. App cũ vẫn trỏ URL cũ.")
        say("Tạo deployment lần đầu...")
        code, out = run(["clasp", "deploy", "--description", desc], timeout=300)

    say(out[:1200] if out else "")
    if code:
        die("deploy thất bại", explain(out))

    items, _ = _deployments()
    if items:
        did = items[-1][0]
        url = "https://script.google.com/macros/s/%s/exec" % did
        say()
        say("URL API: %s" % url)
        return url
    return None


def cmd_url(args):
    items, raw = _deployments()
    if items is None:
        die("Không đọc được deployment", explain(raw))
    if not items:
        say("Chưa có deployment nào. Chạy: deploy")
        sys.exit(1)
    for did, rest in items:
        say("https://script.google.com/macros/s/%s/exec   %s" % (did, rest))


def _set_api(url):
    if not os.path.exists(CONFIG_JS):
        say("Không thấy config.js, bỏ qua bước ghi URL.")
        return
    src = open(CONFIG_JS, encoding="utf-8").read()
    new, n = re.subn(r'(API:\s*")[^"]+(")', lambda m: m.group(1) + url + m.group(2), src, count=1)
    if n:
        open(CONFIG_JS, "w", encoding="utf-8", newline="").write(new)
        say("Đã ghi URL vào assets/js/config.js")


def cmd_ship(args):
    cmd_push(args)
    say("\n" + "─" * 60 + "\n")
    url = cmd_deploy(args)
    if url:
        say()
        _set_api(url)
        say()
        say("XONG. Kiểm tra ngay:")
        say("  python .claude/skills/vjpos-sheet/vjpos_sheet.py health")
        say()
        say("Nếu 'schema' báo lỗi kiểu \"Cannot read properties of null\" thì script")
        say("KHÔNG gắn với spreadsheet nào — nó là script độc lập. Phải tạo lại từ")
        say("trong sheet: mở spreadsheet → Extensions → Apps Script.")


def main():
    # Khai báo tuỳ chọn ở CẢ parser cha lẫn từng subcommand, để gõ kiểu nào cũng chạy:
    #   ... --script-id X init     và     ... init --script-id X
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--script-id", help="Script ID hoặc URL editor")
    common.add_argument("--desc", help="Mô tả cho deployment")
    common.add_argument("--new", action="store_true", help="Ép tạo deployment mới (sinh URL mới)")

    p = argparse.ArgumentParser(description="Đẩy backend VJ-POS lên Apps Script", parents=[common])
    sub = p.add_subparsers(dest="cmd", required=True)
    for name, help_ in [("check", "Kiểm tra môi trường"), ("init", "Tạo .clasp.json"),
                        ("push", "Đẩy code lên"), ("deploy", "Deploy web app"),
                        ("url", "In URL /exec"), ("ship", "push + deploy + ghi config.js")]:
        sub.add_parser(name, help=help_, parents=[common])

    args = p.parse_args()
    {"check": cmd_check, "init": cmd_init, "push": cmd_push,
     "deploy": cmd_deploy, "url": cmd_url, "ship": cmd_ship}[args.cmd](args)


if __name__ == "__main__":
    main()
