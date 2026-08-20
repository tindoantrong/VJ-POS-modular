#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Bộ test chạy trên API + spreadsheet THẬT. Chạy trước mỗi lần deploy ra khách.

    python tests/live_api_test.py

⚠️ TEST NÀY GHI DỮ LIỆU THẬT VÀO SHEET (đơn hàng, tồn kho, nhật ký kho).
   Chỉ chạy trên spreadsheet dùng để thử, KHÔNG chạy trên sheet đang bán hàng thật.
   Chạy xong nhớ dọn:  python tests/live_api_cleanup.py

Đọc SHEET_ID và API từ config.js + hằng số bên dưới. 44 ca, chia 6 nhóm:
  A  chống gian lận trên endpoint public của trang bán gạo
  B  đăng nhập POS và rò rỉ dữ liệu
  C  vòng đời đơn POS: bán -> thu tiền -> huỷ -> hoàn kho
  D  kiểm tra tồn kho, dịch vụ, hàng đặt riêng, phân quyền
  E  nhập kho hàng loạt
  F  ổn định chung
"""
import sys, json, re, time, urllib.request, urllib.error
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO = "f:/wampp/www/VJ-Pos"
KEY = "F:/wampp/www/nbk2020_8/user_config/sheets-writer-key.json"
SHEET_ID = "1mUAY1z3vJnMajdCMBO8y3OFS_ZdQ5V47ENl_tTiMqNU"
API = re.search(r'API:\s*"([^"]+)"', open(REPO + "/assets/js/config.js", encoding="utf-8").read()).group(1)

import gspread
gc = gspread.service_account(filename=KEY)
SH = gc.open_by_key(SHEET_ID)

PASS, FAIL = [], []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print("  %s %-52s %s" % ("PASS" if cond else "FAIL", name, detail))


def post(body):
    data = json.dumps(body).encode()
    try:
        r = urllib.request.urlopen(urllib.request.Request(API, data=data), timeout=90)
        return json.loads(r.read().decode())
    except Exception as e:
        return {"ok": False, "error": "HTTP: %s" % e}


def get(action):
    try:
        r = urllib.request.urlopen(API + "?action=" + action + "&t=" + str(int(time.time() * 1000)), timeout=90)
        return json.loads(r.read().decode())
    except Exception as e:
        return {"ok": False, "error": "HTTP: %s" % e}


def rows(name):
    return SH.worksheet(name).get_all_records(numericise_ignore=["all"])


def stock(pid):
    for p in rows("Admin_Products"):
        if p["product_id"] == pid:
            return int(p["qty_on_hand"])
    return None


PIN = "1234"
created = {"orders": [], "shop_orders": [], "products": [], "payments": []}

print("API:", API)
print("=" * 78)

# ══════════════════════════════════════════════════════════════════
print("\n[A] SHOP — chống gian lận trên endpoint public (không cần PIN)\n")

base = {"action": "customer_order", "customerName": "Test Gian Lan",
        "customerPhone": "0900000001", "customerAddress": "1 Test, Quan 1, TP.HCM"}

# A1 — bịa giá rẻ mạt, server phải bỏ qua và tính lại
r = post(dict(base, items=[{"productId": "ST25", "variantId": "5kg", "qty": 1,
                            "price": 1, "unitPrice": 1, "lineTotal": 1}]))
check("A1 bịa giá 1đ -> server tính lại 185.000", r.get("ok") and r.get("itemsTotal") == 185000,
      "itemsTotal=%s" % r.get("itemsTotal"))
if r.get("ok"):
    created["shop_orders"].append(r["orderId"])

# A2 — sản phẩm không tồn tại
r = post(dict(base, customerPhone="0900000002", items=[{"productId": "VANG9999", "variantId": "5kg", "qty": 1}]))
check("A2 sản phẩm lạ bị từ chối", not r.get("ok"), r.get("error", "")[:40])

# A3 — quy cách không tồn tại
r = post(dict(base, customerPhone="0900000002", items=[{"productId": "ST25", "variantId": "50kg", "qty": 1}]))
check("A3 quy cách lạ bị từ chối", not r.get("ok"), r.get("error", "")[:40])

# A4 — vượt trần 20 túi
r = post(dict(base, customerPhone="0900000002", items=[{"productId": "ST25", "variantId": "5kg", "qty": 21}]))
check("A4 đặt 21 túi bị chặn (trần 20)", not r.get("ok"), r.get("error", "")[:45])

# A5 — số lượng âm
r = post(dict(base, customerPhone="0900000002", items=[{"productId": "ST25", "variantId": "5kg", "qty": -5}]))
check("A5 số lượng âm bị chặn", not r.get("ok"), r.get("error", "")[:40])

# A6 — quá 10 dòng
r = post(dict(base, customerPhone="0900000002",
              items=[{"productId": "ST25", "variantId": "5kg", "qty": 1}] * 11))
check("A6 hơn 10 dòng bị chặn", not r.get("ok"), r.get("error", "")[:45])

# A7 — honeypot: giả vờ OK nhưng KHÔNG ghi
n_before = len(rows("Shop_Orders"))
r = post(dict(base, customerPhone="0900000003", website="http://spam.example",
              items=[{"productId": "ST25", "variantId": "5kg", "qty": 1}]))
time.sleep(1)
check("A7 honeypot: trả ok nhưng không ghi vào sheet",
      r.get("ok") and r.get("spam") and len(rows("Shop_Orders")) == n_before,
      "orderId=%s" % r.get("orderId"))

# A8..A10 — kiểm tra dữ liệu phía server (không tin trình duyệt)
r = post(dict(base, customerName="A", customerPhone="0900000004",
              items=[{"productId": "ST25", "variantId": "5kg", "qty": 1}]))
check("A8 tên quá ngắn bị chặn", not r.get("ok"), r.get("error", "")[:40])

r = post(dict(base, customerPhone="123", items=[{"productId": "ST25", "variantId": "5kg", "qty": 1}]))
check("A9 SĐT sai định dạng bị chặn", not r.get("ok"), r.get("error", "")[:40])

r = post(dict(base, customerPhone="0900000004", customerAddress="abc",
              items=[{"productId": "ST25", "variantId": "5kg", "qty": 1}]))
check("A10 địa chỉ quá ngắn bị chặn", not r.get("ok"), r.get("error", "")[:40])

# A11 — mốc miễn phí ship: đúng 500.000
r = post(dict(base, customerPhone="0900000005",
              items=[{"productId": "ST500", "variantId": "5kg", "qty": 2},
                     {"productId": "ST25", "variantId": "5kg", "qty": 1}]))   # 290k + 185k = 475k
check("A11 475.000đ -> vẫn tính ship 30.000",
      r.get("ok") and r.get("shippingFee") == 30000 and r.get("grandTotal") == 505000,
      "ship=%s total=%s" % (r.get("shippingFee"), r.get("grandTotal")))
if r.get("ok"):
    created["shop_orders"].append(r["orderId"])

r = post(dict(base, customerPhone="0900000006",
              items=[{"productId": "ST500", "variantId": "10kg", "qty": 2}]))   # 550k
check("A12 550.000đ -> miễn phí ship",
      r.get("ok") and r.get("shippingFee") == 0 and r.get("grandTotal") == 550000,
      "ship=%s total=%s" % (r.get("shippingFee"), r.get("grandTotal")))
if r.get("ok"):
    created["shop_orders"].append(r["orderId"])

# A13 — chặn tần suất: số này đã đặt 1 đơn ở A1, thêm 2 nữa là chạm trần 3/giờ
ph = "0900000001"
res = [post(dict(base, customerPhone=ph, items=[{"productId": "ST25", "variantId": "5kg", "qty": 1}]))
       for _ in range(3)]
for x in res:
    if x.get("ok"):
        created["shop_orders"].append(x["orderId"])
blocked = [x for x in res if not x.get("ok")]
check("A13 quá 3 đơn/số/giờ bị chặn", len(blocked) >= 1,
      (blocked[0]["error"][:45] if blocked else "KHÔNG chặn được"))

# A14 — kho KHÔNG bị trừ bởi đơn web
st_before = stock("KSR001")
check("A14 đơn web không đụng tồn kho POS", st_before == 10, "KSR001=%s (mong đợi 10)" % st_before)

# ══════════════════════════════════════════════════════════════════
print("\n[B] POS — đăng nhập\n")

r = get("login&pin=" + PIN)
check("B1 đăng nhập PIN đúng", r.get("ok") and r.get("staff", {}).get("role") == "manager",
      "role=%s" % r.get("staff", {}).get("role"))
check("B2 trả về hoa hồng tháng này/trước", isinstance(r.get("commission"), dict),
      str(r.get("commission"))[:45])

r = post({"action": "login", "pin": PIN})
check("B3 đăng nhập bằng POST (PIN không lọt vào URL)", r.get("ok") is True, "")

r = post({"action": "login", "pin": "9999"})
check("B4 PIN sai bị từ chối", not r.get("ok"), r.get("error", "")[:30])

r = get("staff")
check("B5 danh sách nhân viên KHÔNG lộ PIN",
      r.get("ok") and all("pin" not in s for s in r.get("staff", [])),
      "%d nhân viên" % len(r.get("staff", [])))

r = get("products")
check("B6 danh sách hàng KHÔNG lộ giá vốn",
      r.get("ok") and all("cost" not in p for p in r.get("products", [])),
      "%d sản phẩm" % r.get("count", 0))

# ══════════════════════════════════════════════════════════════════
print("\n[C] POS — vòng đời đơn: bán -> thu tiền -> huỷ -> hoàn kho\n")

st0 = stock("KSR001")
items = [{"productId": "KSR001", "name": "Nhẫn bạc trơn", "brand": "KS", "cat": "RING",
          "qty": 2, "unitPrice": 1000000, "discount": 0, "lineNet": 1800000,
          "rate": 0.05, "commFull": 90000}]
r = post({"action": "submit_order", "pin": PIN, "customerName": "Khach Test POS",
          "customerPhone": "0911222333", "subtotal": 2000000, "itemDiscTotal": 0,
          "billDiscAmt": 200000, "billDiscPct": 10, "netCommBase": 1800000,
          "cardFeeAmt": 54000, "shipAmt": 0, "grandTotal": 1854000,
          "notes": "DON TEST", "items": items})
check("C1 tạo đơn POS", r.get("ok"), "orderId=%s" % r.get("orderId"))
oid = r.get("orderId")
if oid:
    created["orders"].append(oid)

time.sleep(1)
st1 = stock("KSR001")
check("C2 tồn kho bị trừ đúng 2", st1 == st0 - 2, "%s -> %s" % (st0, st1))

logs = [l for l in rows("Admin_Stock_Log") if l.get("reference") == oid]
check("C3 có ghi nhật ký kho SALE", len(logs) == 1 and logs[0]["change_type"] == "SALE",
      str(logs[0]["qty_change"]) if logs else "không có")

o = [x for x in rows("Orders") if x["order_id"] == oid]
check("C4 lưu tách giảm giá bill và phí thẻ (bug đã sửa)",
      bool(o) and int(o[0]["bill_disc_amt"]) == 200000 and int(o[0]["card_fee_amt"]) == 54000,
      "bill=%s card=%s" % (o[0]["bill_disc_amt"], o[0]["card_fee_amt"]) if o else "")
check("C5 số điện thoại giữ số 0 đầu",
      bool(o) and str(o[0]["customer_phone"]) == "0911222333",
      o[0]["customer_phone"] if o else "")

# thanh toán một phần
r = post({"action": "add_payment", "pin": PIN, "orderId": oid, "method": "cash",
          "amount": 854000, "amountForComm": 0, "note": "TEST tra truoc"})
check("C6 ghi nhận thu tiền", r.get("ok"), "collected=%s" % r.get("collectedTotal"))
time.sleep(1)
o = [x for x in rows("Orders") if x["order_id"] == oid]
check("C7 trạng thái -> PARTIAL", bool(o) and o[0]["payment_status"] == "PARTIAL",
      o[0]["payment_status"] if o else "")

# thu nốt
r = post({"action": "add_payment", "pin": PIN, "orderId": oid, "method": "transfer",
          "amount": 1000000, "amountForComm": 0, "note": "TEST tra not"})
time.sleep(1)
o = [x for x in rows("Orders") if x["order_id"] == oid]
check("C8 thu đủ -> PAID + cộng dồn đúng",
      bool(o) and o[0]["payment_status"] == "PAID" and int(o[0]["collected_total"]) == 1854000,
      "%s / %s" % (o[0]["payment_status"], o[0]["collected_total"]) if o else "")

# đơn không tồn tại
r = post({"action": "add_payment", "pin": PIN, "orderId": "VJ-9999", "method": "cash", "amount": 1})
check("C9 thu tiền cho đơn không tồn tại bị chặn (bug đã sửa)", not r.get("ok"), r.get("error", "")[:40])

# huỷ đơn -> hoàn kho
r = post({"action": "void_order", "pin": PIN, "orderId": oid})
check("C10 huỷ đơn", r.get("ok"), "restoredLines=%s" % r.get("restoredLines"))
time.sleep(1)
st2 = stock("KSR001")
check("C11 hoàn kho về đúng ban đầu (bug đã sửa)", st2 == st0, "%s -> %s" % (st1, st2))
vlogs = [l for l in rows("Admin_Stock_Log") if l.get("reference") == oid and l["change_type"] == "VOID_RESTORE"]
check("C12 ghi nhật ký VOID_RESTORE", len(vlogs) == 1, str(vlogs[0]["qty_change"]) if vlogs else "không có")

# ══════════════════════════════════════════════════════════════════
print("\n[D] POS — kiểm tra tồn kho và phân quyền\n")

r = post({"action": "submit_order", "pin": PIN, "customerName": "Test Het Hang",
          "subtotal": 0, "grandTotal": 0,
          "items": [{"productId": "KSN001", "qty": 999, "unitPrice": 1500000, "lineNet": 0, "rate": 0}]})
check("D1 bán quá tồn kho bị chặn", not r.get("ok"), str(r.get("extra") or r.get("error"))[:55])

r = post({"action": "submit_order", "pin": PIN, "customerName": "Test Dich Vu",
          "subtotal": 500000, "grandTotal": 500000, "netCommBase": 500000,
          "items": [{"productId": "SVG001", "name": "Gan da rang", "cat": "TOOTHGEM",
                     "qty": 3, "unitPrice": 500000, "lineNet": 1500000, "rate": 0.1, "commFull": 150000}]})
check("D2 dịch vụ bán được dù tồn kho = 0", r.get("ok"), "orderId=%s" % r.get("orderId"))
if r.get("ok"):
    created["orders"].append(r["orderId"])

r = post({"action": "submit_order", "pin": PIN, "customerName": "Test Hang Dat",
          "subtotal": 700000, "grandTotal": 700000, "netCommBase": 700000,
          "items": [{"productId": "CUSTOM-1", "name": "Nhan dat rieng", "cat": "ORDER",
                     "qty": 1, "unitPrice": 700000, "lineNet": 700000, "rate": 0.02, "commFull": 14000}]})
check("D3 hàng đặt riêng (không có trong kho) bán được", r.get("ok"), "orderId=%s" % r.get("orderId"))
if r.get("ok"):
    created["orders"].append(r["orderId"])

# D4 — phân quyền: tạo tài khoản staff tạm, thử giả mạo staffRole trong payload.
# Bản trước của ca này viết ẩu (có "or True" nên luôn pass, không kiểm gì cả).
SH.worksheet("Admin_Staff").append_row(["S099", "Nhan vien test", "staff", "TRUE", "4321"],
                                       value_input_option="RAW")
time.sleep(2)
try:
    r = post({"action": "void_order", "pin": "4321", "orderId": "VJ-0001", "staffRole": "manager"})
    check("D4 staff giả mạo staffRole=manager để huỷ đơn -> bị chặn",
          not r.get("ok") and "manager" in str(r.get("error", "")).lower(), str(r.get("error"))[:45])

    r = post({"action": "bulk_import", "pin": "4321", "staffRole": "manager",
              "items": [{"product_id": "HACK001", "qty_add": 999, "name": "Hang lau"}]})
    check("D5 staff giả mạo để nhập kho -> bị chặn",
          not r.get("ok") and "manager" in str(r.get("error", "")).lower(), str(r.get("error"))[:45])

    r = post({"action": "submit_order", "pin": "4321", "customerName": "Test staff ban hang",
              "subtotal": 850000, "grandTotal": 850000, "netCommBase": 850000,
              "items": [{"productId": "CHB001", "name": "Vong tay charm", "qty": 1,
                         "unitPrice": 850000, "lineNet": 850000, "rate": 0.05, "commFull": 42500}]})
    check("D6 staff vẫn bán hàng bình thường", r.get("ok"), "orderId=%s" % r.get("orderId"))
    if r.get("ok"):
        created["orders"].append(r["orderId"])
        time.sleep(2)
        o = [x for x in rows("Orders") if x["order_id"] == r["orderId"]]
        check("D7 staff_id lấy từ PIN, không tin client gửi",
              bool(o) and o[0]["staff_id"] == "S099", o[0]["staff_id"] if o else "?")
finally:
    ws = SH.worksheet("Admin_Staff")
    v = ws.get_all_values()
    for i in range(len(v) - 1, 0, -1):
        if v[i][0] == "S099":
            ws.delete_rows(i + 1)

# ══════════════════════════════════════════════════════════════════
print("\n[E] Nhập kho hàng loạt\n")

r = post({"action": "bulk_import", "pin": PIN, "items": [
    {"product_id": "KSR001", "qty_add": 5},
    {"product_id": "TEST999", "qty_add": 7, "price": 250000, "name": "Nhan test nhap kho",
     "type": "RING", "brand": "KS"},
]})
check("E1 nhập kho chạy", r.get("ok"), "updated=%s added=%s" % (r.get("updated"), r.get("added")))
time.sleep(1)
if r.get("ok"):
    created["products"].append("TEST999")

check("E2 hàng cũ được cộng tồn", stock("KSR001") == st0 + 5, "%s -> %s" % (st0, stock("KSR001")))

p = get("products")
new = [x for x in p.get("products", []) if x["id"] == "TEST999"]
check("E3 hàng MỚI hiện đúng tên, không phải 'Hàng hóa' (bug đã sửa)",
      bool(new) and new[0]["name"] == "Nhan test nhap kho",
      new[0]["name"] if new else "không thấy")
check("E4 hàng mới có tồn kho và giá đúng",
      bool(new) and new[0]["qty"] == 7 and new[0]["price"] == 250000,
      "qty=%s price=%s" % (new[0]["qty"], new[0]["price"]) if new else "")

# ══════════════════════════════════════════════════════════════════
print("\n[F] Ổn định\n")

r = get("ping")
check("F1 ping", r.get("ok") and r.get("version") == "2.3.0", "v%s" % r.get("version"))
r = get("schema")
iss = r.get("issues", {})
check("F2 schema đủ cột", not iss.get("missingSheets") and not iss.get("missingHeaders"), "")
r = get("khong_ton_tai")
check("F3 action lạ không làm sập", r.get("ok") is True, "trả về danh sách action")
r = post({"action": "submit_order", "pin": "0000", "items": []})
check("F4 PIN sai không ghi được", not r.get("ok"), r.get("error", "")[:30])

print("\n" + "=" * 78)
print("KẾT QUẢ: %d PASS / %d FAIL" % (len(PASS), len(FAIL)))
if FAIL:
    print("\nCÁC CA HỎNG:")
    for f in FAIL:
        print("  - " + f)
print("\nDữ liệu test đã tạo (sẽ dọn ở bước sau):")
print("  " + json.dumps(created, ensure_ascii=False))
print("\nDọn dữ liệu test bằng:  python tests/live_api_cleanup.py")
sys.exit(1 if FAIL else 0)
