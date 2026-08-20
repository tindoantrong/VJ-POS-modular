# VJ·POS — Cấu trúc Google Sheets

Backend đọc/ghi **theo tên cột**, không theo vị trí cột. Nghĩa là:

- Chèn thêm cột, đổi chỗ cột → **an toàn**.
- Đổi TÊN cột → phải thêm tên mới vào danh sách alias trong
  [backend/00_schema.gs](../backend/00_schema.gs), nếu không cột đó bị coi như không tồn tại.
- Xoá dòng header (dòng 1) → code lùi về vị trí cột cố định kiểu cũ, dễ ghi sai dữ liệu.
  **Đừng bao giờ xoá dòng 1.**

Tên cột được chuẩn hoá trước khi so khớp: bỏ dấu tiếng Việt, `đ`→`d`, chữ thường,
khoảng trắng/gạch ngang → gạch dưới. Nên `Tên Hàng`, `ten_hang`, `TEN-HANG` là như nhau.

## Công cụ tự kiểm tra

Mở URL sau trên trình duyệt, nó liệt kê sheet thiếu / cột thiếu / header thực tế đang có:

```
<API_URL>?action=schema
```

Hoặc chạy hàm `testSchema()` trong editor Apps Script rồi xem Logs.

## Các sheet

### Admin_Staff
Nhân viên và mã PIN đăng nhập.

| Field | Tên cột chấp nhận | Ghi chú |
|---|---|---|
| staff_id | `staff_id`, `id` | |
| name | `name`, `staff_name` | |
| role | `role`, `staff_role` | `manager` mới được huỷ đơn và nhập kho |
| active | `active`, `is_active` | `FALSE`/`0` → không đăng nhập được |
| pin | `pin`, `staff_pin` | **Không bao giờ được trả ra API** |

### Admin_Products
Danh mục hàng và tồn kho.

| Field | Tên cột chấp nhận | Ghi chú |
|---|---|---|
| product_id | `product_id`, `id` | |
| ten_hang | `ten_hang`, `product_name`, `name`, `ten_san_pham`… | **Tên hiển thị trên màn bán hàng** |
| loai_hang | `loai_hang`, `type` | Quyết định icon, bộ lọc, và có trừ kho hay không |
| nhom_hang | `nhom_hang`, `cat`, `category` | Dùng để gom nhóm / tìm kiếm |
| brand | `brand_id`, `brand` | Khớp với `Admin_Artists.id` để lấy tỉ lệ hoa hồng |
| price | `gia_ban`, `price` | |
| cost | `gia_von`, `cost` | |
| qty | `qty_on_hand`, `ton_kho`, `qty` | |
| img | `image_url`, `img` | |
| active | `active`, `is_active` | `FALSE` → ẩn khỏi app |

Tên hiển thị = `ten_hang`, nếu rỗng thì lấy `nhom_hang`, rỗng nữa thì lấy `product_id`.

**Loại hàng không trừ tồn kho** (`SERVICE_TYPES` trong `00_schema.gs`):
`Service`, `GRILLZ`, `TOOTHGEM`, `TOOTHCHARM`, `Dịch vụ` — luôn hiện tồn 999.

### Admin_Artists
Mỗi brand một tỉ lệ hoa hồng trả cho nhân viên.

| Field | Tên cột chấp nhận |
|---|---|
| id | `artist_id`, `id`, `brand_id` |
| name | `name` |
| type | `type` |
| rate | `commission_rate_to_staff`, `rate` |

`rate` là số thập phân: `0.05` = 5%.

### Orders
Một dòng một đơn. `status = VOID` là đơn đã huỷ (không xoá dòng).

`order_id`, `order_date`, `staff_id`, `customer_name`, `customer_phone`,
`base_cost_total` (= subtotal), `discount_total`, `net_commission_base`,
`extra_fee_total`, `grand_total`, `collected_total`, `collected_for_commission`,
`payment_status`, `commission_paid_total`, `status`.

`payment_status` do backend tự tính khi ghi thanh toán: `PAID` / `PARTIAL` / `UNPAID`.

### Order_Items
Một dòng một sản phẩm trong đơn. `order_item_id` = `<order_id>-01`, `-02`…

`line_net_commission_base` là doanh thu dòng SAU khi đã phân bổ giảm giá bill —
đây mới là gốc nhân với `staff_commission_rate` ra `commission_full`.

### Payments
Một dòng một lần thu tiền. Một đơn thu nhiều lần được.

`payment_id`, `order_id`, `payment_date`, `method`, `amount_total`,
`amount_for_commission`, `note`.

`method`: `cash` | `pos` | `transfer` | `paypal`.

### Admin_Stock_Log
Nhật ký mọi biến động kho — không được sửa tay.

`log_id`, `timestamp`, `product_id`, `change_type`, `qty_change`, `qty_before`,
`qty_after`, `reference`, `changed_by`.

`change_type`: `SALE` (âm) · `VOID_RESTORE` (dương) · `IMPORT` · `NEW_PRODUCT` · `ADJUSTMENT`.

> Sheet này ghi theo **vị trí cột cố định** (9 cột đúng thứ tự trên), không theo header —
> khác với các sheet còn lại. Đừng chèn thêm cột vào giữa.
