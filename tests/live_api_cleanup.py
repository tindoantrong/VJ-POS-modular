#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Dọn dữ liệu do live_api_test.py tạo ra, đưa spreadsheet về đúng trạng thái sau seed.

    python tests/live_api_cleanup.py            # xem sẽ xoá gì, KHÔNG xoá
    python tests/live_api_cleanup.py --yes      # xoá thật

⚠️ XOÁ TOÀN BỘ dòng trong Orders, Order_Items, Payments, Shop_Orders,
   Shop_Order_Items, Admin_Stock_Log. Đây là công cụ dọn sau khi TEST —
   ĐỪNG chạy trên spreadsheet đang bán hàng thật.
"""
import sys, os, gspread

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
KEY = os.environ.get("VJPOS_SA_KEY", "F:/wampp/www/nbk2020_8/user_config/sheets-writer-key.json")
SHEET_ID = "1mUAY1z3vJnMajdCMBO8y3OFS_ZdQ5V47ENl_tTiMqNU"

# Sheet giao dịch: xoá sạch dòng dữ liệu, giữ header
WIPE = ["Orders", "Order_Items", "Payments", "Shop_Orders", "Shop_Order_Items", "Admin_Stock_Log"]

# Tồn kho sau seed — phải khớp SEED trong .claude/skills/vjpos-sheet/vjpos_sheet.py
SEED_QTY = {"KSR001": 10, "KSN001": 5, "CHB001": 8, "SVG001": 0}

# Bản ghi do test tạo, xoá hẳn
TEST_PRODUCTS = ["TEST999", "HACK001"]
TEST_STAFF = ["S099"]

DRY = "--yes" not in sys.argv


def main():
    gc = gspread.service_account(filename=KEY)
    sh = gc.open_by_key(SHEET_ID)
    print("Spreadsheet: %s" % sh.title)
    print("Chế độ: %s\n" % ("XEM TRƯỚC (thêm --yes để xoá thật)" if DRY else "XOÁ THẬT"))

    for name in WIPE:
        try:
            ws = sh.worksheet(name)
        except Exception:
            continue
        n = len(ws.get_all_values()) - 1
        if n > 0:
            print("  %-18s xoá %d dòng" % (name, n))
            if not DRY:
                ws.delete_rows(2, n + 1)
        else:
            print("  %-18s đã sạch" % name)

    # Sản phẩm test + trả tồn kho về mức seed
    ws = sh.worksheet("Admin_Products")
    vals = ws.get_all_values()
    hdr = [h.lower() for h in vals[0]]
    cp, cq = hdr.index("product_id"), hdr.index("qty_on_hand")

    for i in range(len(vals) - 1, 0, -1):
        if vals[i][cp] in TEST_PRODUCTS:
            print("  %-18s xoá sản phẩm %s" % ("Admin_Products", vals[i][cp]))
            if not DRY:
                ws.delete_rows(i + 1)

    vals = ws.get_all_values() if not DRY else vals
    for i in range(1, len(vals)):
        pid = vals[i][cp]
        if pid in SEED_QTY and str(vals[i][cq]) != str(SEED_QTY[pid]):
            print("  %-18s %s tồn kho %s → %d" % ("Admin_Products", pid, vals[i][cq], SEED_QTY[pid]))
            if not DRY:
                ws.update_cell(i + 1, cq + 1, SEED_QTY[pid])

    ws = sh.worksheet("Admin_Staff")
    vals = ws.get_all_values()
    for i in range(len(vals) - 1, 0, -1):
        if vals[i][0] in TEST_STAFF:
            print("  %-18s xoá nhân viên %s" % ("Admin_Staff", vals[i][0]))
            if not DRY:
                ws.delete_rows(i + 1)

    print()
    print("Chưa xoá gì. Thêm --yes để thực hiện." if DRY else "Đã dọn xong.")


if __name__ == "__main__":
    main()
