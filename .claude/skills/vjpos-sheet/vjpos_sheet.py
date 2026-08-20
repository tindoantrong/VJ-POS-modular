#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
vjpos_sheet.py — thao tác trực tiếp lên Google Spreadsheet của VJ-POS bằng service account.

NGUYÊN TẮC QUAN TRỌNG:
Định nghĩa cột KHÔNG viết lại ở đây mà ĐỌC TỪ backend/98_setup.gs (biến SHEET_TEMPLATES).
Nhờ vậy hai đường dựng sheet — chạy setupNewSpreadsheet() trong Apps Script, hay chạy
script này — luôn tạo ra đúng một cấu trúc. Sửa cột chỉ cần sửa 98_setup.gs.

Lệnh:
  setup    tạo các sheet còn thiếu kèm header (bỏ qua sheet đã có, không xoá dữ liệu)
  seed     nạp dữ liệu mồi vào sheet đang trống
  verify   đối chiếu sheet thật với 98_setup.gs, báo thiếu sheet / thiếu cột
  orders   xem đơn gần nhất (--shop cho đơn web, --pos cho đơn POS)
  health   gọi API đã deploy kiểm tra ping / schema / shop_products
  set-api  ghi URL API vào assets/js/config.js
"""
import argparse, json, os, re, sys, urllib.request, urllib.error

# Windows console hay là cp932/cp1258, ép UTF-8 để in được tiếng Việt
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SETUP_GS = os.path.join(REPO, "backend", "98_setup.gs")
CONFIG_JS = os.path.join(REPO, "assets", "js", "config.js")
DEFAULT_KEY = "F:/wampp/www/nbk2020_8/user_config/sheets-writer-key.json"


# ══════════════════════════════════════════════════════════════
# Đọc SHEET_TEMPLATES từ file .gs — nguồn sự thật duy nhất về cột
# ══════════════════════════════════════════════════════════════
def load_templates():
    if not os.path.exists(SETUP_GS):
        die("Không tìm thấy %s" % SETUP_GS)
    src = open(SETUP_GS, encoding="utf-8").read()

    i = src.find("const SHEET_TEMPLATES")
    if i < 0:
        die("Không thấy khai báo SHEET_TEMPLATES trong 98_setup.gs")
    i = src.index("{", i)
    j = src.index("\n};", i)
    body = src[i:j + 2]

    body = re.sub(r"/\*.*?\*/", "", body, flags=re.S)      # bỏ comment /* */
    body = re.sub(r"//[^\n]*", "", body)                    # bỏ comment //
    body = re.sub(r"(\w+)\s*:", r'"\1":', body)             # Ten: -> "Ten":
    body = re.sub(r",(\s*[}\]])", r"\1", body)              # bỏ dấu phẩy thừa

    try:
        return json.loads(body)
    except json.JSONDecodeError as e:
        die("Không đọc được SHEET_TEMPLATES: %s" % e)


# Dữ liệu mồi. PHẢI KHỚP seedStarterData() trong backend/98_setup.gs.
# Chỉ là dữ liệu demo để đăng nhập và bán thử, đổi thoải mái.
SEED = {
    "Admin_Staff": [
        {"staff_id": "S001", "name": "Quản lý", "role": "manager", "active": True, "pin": "1234"},
    ],
    "Admin_Artists": [
        {"artist_id": "KS", "name": "Kim Silver", "type": "consign", "commission_rate_to_staff": 0.05, "active": True},
        {"artist_id": "CH", "name": "Charm House", "type": "consign", "commission_rate_to_staff": 0.05, "active": True},
        {"artist_id": "OR", "name": "Hàng đặt riêng", "type": "order", "commission_rate_to_staff": 0.02, "active": True},
        {"artist_id": "SV", "name": "Dịch vụ tại tiệm", "type": "service", "commission_rate_to_staff": 0.10, "active": True},
    ],
    "Admin_Products": [
        {"product_id": "KSR001", "ten_hang": "Nhẫn bạc trơn", "loai_hang": "RING", "nhom_hang": "RING",
         "brand_id": "KS", "gia_ban": 1000000, "gia_von": 600000, "qty_on_hand": 10, "image_url": "", "active": True},
        {"product_id": "KSN001", "ten_hang": "Dây chuyền bạc", "loai_hang": "NECKLACE", "nhom_hang": "NECKLACE",
         "brand_id": "KS", "gia_ban": 1500000, "gia_von": 900000, "qty_on_hand": 5, "image_url": "", "active": True},
        {"product_id": "CHB001", "ten_hang": "Vòng tay charm", "loai_hang": "BRACELET", "nhom_hang": "BRACELET",
         "brand_id": "CH", "gia_ban": 850000, "gia_von": 500000, "qty_on_hand": 8, "image_url": "", "active": True},
        {"product_id": "SVG001", "ten_hang": "Gắn đá răng", "loai_hang": "TOOTHGEM", "nhom_hang": "TOOTHGEM",
         "brand_id": "SV", "gia_ban": 500000, "gia_von": 100000, "qty_on_hand": 0, "image_url": "", "active": True},
    ],
}


def die(msg):
    print("LỖI: " + msg)
    sys.exit(1)


def norm(v):
    """Chuẩn hoá tên cột giống _normalizeHeader_ trong backend/20_sheets.gs."""
    import unicodedata
    s = str(v or "").strip().lower()
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("đ", "d")
    s = re.sub(r"[\s\-]+", "_", s)
    s = re.sub(r"[^a-z0-9_]", "", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s


def open_sheet(args):
    try:
        import gspread
    except ImportError:
        die("Chưa cài gspread. Chạy: pip install gspread")
    key = args.key or os.environ.get("VJPOS_SA_KEY") or DEFAULT_KEY
    if not os.path.exists(key):
        die("Không thấy file key service account: %s" % key)
    if not args.sheet:
        die("Thiếu --sheet <SPREADSHEET_ID>")
    try:
        gc = gspread.service_account(filename=key)
        return gc.open_by_key(args.sheet)
    except PermissionError:
        sa = json.load(open(key)).get("client_email", "(không đọc được)")
        die("Service account chưa có quyền.\n"
            "  → Mở spreadsheet → Share → thêm %s với quyền Editor" % sa)
    except Exception as e:
        die("%s: %s" % (type(e).__name__, str(e)[:300]))


# ══════════════════════════════════════════════════════════════
def cmd_setup(args):
    sh = open_sheet(args)
    templates = load_templates()
    existing = {w.title: w for w in sh.worksheets()}

    created, skipped = [], []
    for name, headers in templates.items():
        if name in existing:
            skipped.append(name)
            continue

        ws = sh.add_worksheet(title=name, rows=200, cols=max(len(headers) + 2, 10))
        ws.update(values=[headers], range_name="A1")
        ws.freeze(rows=1)
        ws.format("1:1", {
            "textFormat": {"bold": True, "foregroundColor": {"red": .69, "green": .77, "blue": .85}},
            "backgroundColor": {"red": .06, "green": .07, "blue": .10},
        })
        created.append("%s (%d cột)" % (name, len(headers)))

    # Xoá Sheet1 mặc định nếu còn trống và đã có sheet khác
    for junk in ("Sheet1", "Trang tính1"):
        w = {x.title: x for x in sh.worksheets()}.get(junk)
        if w and len(sh.worksheets()) > 1 and not any(any(c for c in r) for r in w.get_all_values()):
            sh.del_worksheet(w)
            created.append("(đã xoá %s trống)" % junk)

    print("TẠO MỚI:")
    for c in created:
        print("  + " + c)
    if skipped:
        print("BỎ QUA (đã có, không đụng dữ liệu):")
        for s in skipped:
            print("  = " + s)
    if not created:
        print("  (không có gì để tạo)")
    print("\nBước tiếp: seed rồi verify")


def cmd_seed(args):
    sh = open_sheet(args)
    done, skipped = [], []

    for name, rows in SEED.items():
        try:
            ws = sh.worksheet(name)
        except Exception:
            skipped.append("%s (chưa có sheet — chạy setup trước)" % name)
            continue

        values = ws.get_all_values()
        if len(values) > 1:
            skipped.append("%s (đã có dữ liệu)" % name)
            continue

        hmap = {norm(h): i for i, h in enumerate(values[0])} if values else {}
        if not hmap:
            skipped.append("%s (không có dòng header)" % name)
            continue

        width = len(values[0])
        batch = []
        for r in rows:
            line = [""] * width
            for k, v in r.items():
                idx = hmap.get(norm(k))
                if idx is not None:
                    line[idx] = v
            batch.append(line)

        ws.append_rows(batch, value_input_option="USER_ENTERED")
        done.append("%s: %d dòng" % (name, len(batch)))

    print("ĐÃ NẠP:")
    for d in done:
        print("  + " + d)
    if skipped:
        print("BỎ QUA:")
        for s in skipped:
            print("  = " + s)
    if any("Admin_Staff" in d for d in done):
        print("\n⚠️  Tài khoản mồi S001 / PIN 1234 — ĐỔI PIN NGAY trong sheet Admin_Staff")


def cmd_verify(args):
    sh = open_sheet(args)
    templates = load_templates()
    existing = {w.title: w for w in sh.worksheets()}

    problems = []
    print("ĐỐI CHIẾU SHEET THẬT VỚI backend/98_setup.gs\n")

    for name, headers in templates.items():
        ws = existing.get(name)
        if not ws:
            print("  THIẾU SHEET  %s" % name)
            problems.append(name)
            continue

        actual = ws.row_values(1) if ws.row_count else []
        amap = {norm(h) for h in actual if norm(h)}
        missing = [h for h in headers if norm(h) not in amap]
        extra = [h for h in actual if h and norm(h) not in {norm(x) for x in headers}]

        if missing:
            print("  THIẾU CỘT    %-18s %s" % (name, ", ".join(missing)))
            problems.append(name)
        else:
            note = ("  (+%d cột thêm: %s)" % (len(extra), ", ".join(extra))) if extra else ""
            rows = max(0, len(ws.get_all_values()) - 1)
            print("  OK           %-18s %2d cột, %d dòng dữ liệu%s" % (name, len(headers), rows, note))

    print()
    if problems:
        print("CHƯA SẴN SÀNG — chạy lệnh setup để tạo phần còn thiếu")
        sys.exit(1)

    try:
        staff = sh.worksheet("Admin_Staff").get_all_records()
        active = [s for s in staff if str(s.get("active", "")).upper() not in ("FALSE", "0", "")]
        if not active:
            print("CẢNH BÁO: chưa có nhân viên nào active → không ai đăng nhập được POS")
            sys.exit(1)
        weak = [s for s in active if str(s.get("pin", "")) == "1234"]
        print("SẴN SÀNG. %d nhân viên active." % len(active))
        if weak:
            print("⚠️  Còn %d tài khoản dùng PIN mặc định 1234 — đổi ngay." % len(weak))
    except Exception as e:
        print("Không đọc được Admin_Staff: %s" % str(e)[:150])


def cmd_orders(args):
    sh = open_sheet(args)
    name = "Orders" if args.pos else "Shop_Orders"
    try:
        ws = sh.worksheet(name)
    except Exception:
        die("Chưa có sheet %s" % name)

    rows = ws.get_all_records()
    if not rows:
        print("Chưa có đơn nào trong %s." % name)
        return

    rows = rows[-args.limit:]
    print("%d đơn gần nhất trong %s:\n" % (len(rows), name))

    if args.pos:
        for r in rows:
            print("  %-10s %-19s %-18s %12s  %s" % (
                r.get("order_id", ""), str(r.get("order_date", ""))[:19],
                str(r.get("customer_name", ""))[:18],
                "{:,}d".format(int(r.get("grand_total") or 0)),
                r.get("status", "")))
    else:
        for r in rows:
            print("  %-9s %-19s %-16s %-12s %11s  %s" % (
                r.get("shop_order_id", ""), str(r.get("created_at", ""))[:19],
                str(r.get("customer_name", ""))[:16], r.get("customer_phone", ""),
                "{:,}d".format(int(r.get("grand_total") or 0)),
                r.get("status", "")))
        new = [r for r in rows if str(r.get("status", "")).upper() == "NEW"]
        if new:
            print("\n  → %d đơn đang chờ xác nhận" % len(new))


def _api_url(args):
    if args.url:
        return args.url
    if os.path.exists(CONFIG_JS):
        m = re.search(r'API:\s*"([^"]+)"', open(CONFIG_JS, encoding="utf-8").read())
        if m:
            return m.group(1)
    die("Không tìm được URL API. Truyền --url hoặc đặt trong assets/js/config.js")


def cmd_health(args):
    base = _api_url(args)
    print("API: %s\n" % base)
    ok = True

    for action, check in (("ping", "msg"), ("schema", "issues"), ("shop_products", "products")):
        try:
            with urllib.request.urlopen(base + "?action=" + action, timeout=30) as r:
                data = json.loads(r.read().decode("utf-8"))
        except Exception as e:
            print("  LỖI    %-14s %s" % (action, str(e)[:90]))
            ok = False
            continue

        if not data.get("ok") or check not in data:
            print("  HỎNG   %-14s %s" % (action, str(data.get("error") or "thiếu trường '%s'" % check)[:90]))
            if action == "shop_products":
                print("         → backend chưa deploy 80_shop.gs")
            ok = False
            continue

        if action == "ping":
            print("  OK     %-14s version %s" % (action, data.get("version")))
        elif action == "schema":
            iss = data["issues"]
            bad = iss.get("missingSheets") or iss.get("missingHeaders")
            if bad:
                print("  HỎNG   %-14s thiếu: %s" % (action, json.dumps(bad, ensure_ascii=False)[:120]))
                ok = False
            else:
                print("  OK     %-14s đủ sheet và cột" % action)
        else:
            n = sum(len(p.get("variants", [])) for p in data["products"])
            print("  OK     %-14s %d sản phẩm / %d quy cách" % (action, len(data["products"]), n))

    print("\n" + ("TẤT CẢ BÌNH THƯỜNG" if ok else "CÓ VẤN ĐỀ — xem ở trên"))
    sys.exit(0 if ok else 1)


def cmd_set_api(args):
    if not args.url:
        die("Thiếu --url")
    if not os.path.exists(CONFIG_JS):
        die("Không thấy %s" % CONFIG_JS)
    src = open(CONFIG_JS, encoding="utf-8").read()
    new, n = re.subn(r'(API:\s*")[^"]+(")', lambda m: m.group(1) + args.url + m.group(2), src, count=1)
    if not n:
        die("Không tìm thấy dòng API: trong config.js")
    open(CONFIG_JS, "w", encoding="utf-8", newline="").write(new)
    print("Đã ghi URL API vào assets/js/config.js:\n  %s" % args.url)


def main():
    p = argparse.ArgumentParser(description="Quản lý spreadsheet VJ-POS")
    p.add_argument("--sheet", help="Spreadsheet ID (lấy trong URL)")
    p.add_argument("--key", help="Đường dẫn file key service account")
    p.add_argument("--url", help="URL /exec của Apps Script")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("setup", help="Tạo sheet còn thiếu kèm header")
    sub.add_parser("seed", help="Nạp dữ liệu mồi vào sheet trống")
    sub.add_parser("verify", help="Đối chiếu sheet với 98_setup.gs")
    sub.add_parser("health", help="Kiểm tra API đã deploy")
    sub.add_parser("set-api", help="Ghi URL API vào config.js")

    o = sub.add_parser("orders", help="Xem đơn gần nhất")
    o.add_argument("--pos", action="store_true", help="Đơn POS thay vì đơn web")
    o.add_argument("--shop", action="store_true", help="Đơn web (mặc định)")
    o.add_argument("--limit", type=int, default=15)

    args = p.parse_args()
    {"setup": cmd_setup, "seed": cmd_seed, "verify": cmd_verify,
     "orders": cmd_orders, "health": cmd_health, "set-api": cmd_set_api}[args.cmd](args)


if __name__ == "__main__":
    main()
