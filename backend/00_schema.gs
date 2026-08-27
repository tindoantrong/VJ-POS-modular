// ═══════════════════════════════════════════════════════════
// VJ-POS Apps Script — 00_schema.gs
// Hằng số toàn cục + khai báo cột mong đợi của từng sheet.
//
// ⚠️ THỨ TỰ FILE QUAN TRỌNG: Apps Script chạy code top-level theo thứ tự file trong
// editor. Tiền tố số (00_, 10_, 20_...) giữ đúng thứ tự đó. Đừng đổi tên file.
//
// requiredAnyOf: mỗi field liệt kê CÁC TÊN CỘT CHẤP NHẬN ĐƯỢC. Đọc/ghi sheet luôn đi
// qua bảng này (_col_) nên đổi tên cột trong Sheets chỉ cần thêm alias ở đây, không
// phải sửa code. Xem docs/SHEETS.md.
// ═══════════════════════════════════════════════════════════

const SS = SpreadsheetApp.getActiveSpreadsheet();

const API_VERSION = "2.3.0";
const TZ = Session.getScriptTimeZone();

/* Vòng đời đơn từ trang bán hàng khách lẻ: NEW → CONFIRMED → SHIPPED → DONE, hoặc CANCELLED.
   NGUỒN SỰ THẬT DUY NHẤT — 80_shop.gs ghi trạng thái đầu tiên từ đây, 85_shop_admin.gs
   dựng dropdown và bảng màu cũng từ đây. Thêm trạng thái mới thì thêm ở đây, rồi bổ sung
   màu trong SHOP_STATUS_STYLE và chạy lại setupShopOrdersUi(). */
const SHOP_STATUSES = ["NEW", "CONFIRMED", "SHIPPED", "DONE", "CANCELLED"];

// Loại hàng không trừ tồn kho (dịch vụ làm tại chỗ)
const SERVICE_TYPES = ["Service", "GRILLZ", "TOOTHGEM", "TOOTHCHARM", "Dịch vụ"];

const SCHEMA = {
  Admin_Staff: {
    requiredAnyOf: {
      staff_id: ["staff_id","id","staffid"],
      name: ["name","staff_name","staffname"],
      role: ["role","staff_role","staffrole"],
      active: ["active","is_active","enabled"],
      pin: ["pin","staff_pin","staffpin"],
    },
  },

  Admin_Products: {
    requiredAnyOf: {
      product_id: ["product_id","id","productid"],
      loai_hang: ["loai_hang","type","loaihang"],
      nhom_hang: ["nhom_hang","cat","category","nhomhang","group"],
      // Giữ alias rộng để đọc được tên sản phẩm dù sheet đặt tên cột kiểu nào
      ten_hang: [
        "ten_hang","ten_hàng","tenhang",
        "product_name","product name","name",
        "ten_san_pham","ten san pham","tensanpham",
        "ten_sp","ten sp","tensp",
        "ten hang"
      ],
      brand: ["brand_id","brand","thuong_hieu","thương_hiệu"],
      price: ["gia_ban","price","giaban"],
      cost: ["gia_von","cost","giavon"],
      qty: ["qty_on_hand","ton_kho","qty","tonkho"],
      img: ["image_url","img","image","imageurl"],
      active: ["active","is_active","enabled"],
    },
  },

  Orders: {
    requiredAnyOf: {
      order_id: ["order_id","orderid","id"],
      date: ["order_date","date","created_at","created","datetime"],
      staff_id: ["staff_id","staffid"],
      customer_name: ["customer_name","cust_name","name"],
      customer_phone: ["customer_phone","cust_phone","phone"],
      subtotal: ["base_cost_total","subtotal"],
      item_disc_total: ["discount_total","item_disc_total","item_discount_total"],
      bill_disc_amt: ["bill_disc_amt","bill_discount_amount","bill_disc_amount","bill_disc"],
      bill_disc_pct: ["bill_disc_pct","bill_discount_pct","bill_disc_percent","bill_disc_percent"],
      card_fee_amt: ["card_fee_amt","card_fee","card_fee_amount","fee_card"],
      ship_amt: ["ship_amt","shipping","ship_amount","delivery_fee","ship"],
      notes: ["notes","note"],
      net_comm_base: ["net_commission_base","net_comm_base"],
      extra_fee_total: ["extra_fee_total","extra_fee","fee_total"],
      grand_total: ["grand_total","total"],
      collected_total: ["collected_total"],
      collected_for_commission: ["collected_for_commission"],
      payment_status: ["payment_status"],
      commission_paid_total: ["commission_paid_total"],
      status: ["status"],
    },
  },

  Order_Items: {
    requiredAnyOf: {
      line_item_id: ["order_item_id","line_item_id","lineitem_id","id"],
      order_id: ["order_id","orderid"],
      product_id: ["product_id","productid"],
      name: ["product_name","name"],
      brand: ["brand_id","brand"],
      cat: ["cat","nhom_hang","category","nhomhang","group"],
      qty: ["qty","quantity"],
      unit_price: ["unit_price","price"],
      line_base_cost: ["line_base_cost"],
      discount: ["line_discount_amount","discount","disc"],
      line_net: ["line_net_commission_base","line_net","net"],
      staff_id: ["staff_id","staffid"],
      rate: ["staff_commission_rate","rate"],
      comm_full: ["commission_full","comm_full"],
      comm_paid: ["commission_paid","commiss_paid","commission_paid_amount"],
    },
  },

  Payments: {
    requiredAnyOf: {
      payment_id: ["payment_id","paymentid","id"],
      order_id: ["order_id","orderid"],
      date: ["payment_date","date","created_at","created"],
      method: ["method"],
      amount: ["amount_total","amount"],
      amount_for_comm: ["amount_for_commission","amount_for_comm","amount_comm"],
      note: ["note","notes"],
    },
  },

  Admin_Artists: {
    requiredAnyOf: {
      id: ["artist_id","id","brand_id","brand"],
      name: ["name"],
      type: ["type"],
      rate: ["commission_rate_to_staff","rate"],
      active: ["active","is_active","enabled"],
    },
  },

  Admin_Stock_Log: {
    requiredAnyOf: {
      log_id: ["log_id","id"],
      date: ["timestamp","date","created_at","created"],
      product_id: ["product_id","productid"],
      change_type: ["change_type","type"],
      qty_change: ["qty_change","qtychange"],
      qty_before: ["qty_before","qtybefore"],
      qty_after: ["qty_after","qtyafter"],
      reference: ["reference","ref"],
      changed_by: ["changed_by","by"],
    },
  },
};
