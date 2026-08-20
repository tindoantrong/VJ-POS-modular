# Ảnh sản phẩm cho trang bán hàng

Lưu 4 ảnh anh gửi vào đây, **đúng tên file** dưới đây (phân biệt hoa thường):

| Tên file | Ảnh nào |
|---|---|
| `st25-banner.jpg` | Banner ST25 — có bao gạo, tô cơm, chữ "GẠO ST25" |
| `st25-grains.jpg` | Ảnh ghép hạt gạo ST25 (thúng tre + thìa gỗ + bông lúa) |
| `st500-banner.jpg` | Banner ST500 — có bao gạo, tô cơm, chữ "GẠO ST500" |
| `st500-grains.jpg` | Ảnh ghép hạt gạo ST500 |

Đường dẫn được khai báo ở `assets/js/shop/products.js`. Đổi tên file thì sửa ở đó.

**Chưa có ảnh trang vẫn chạy bình thường** — thẻ sản phẩm tự hiện khối thay thế
(biểu tượng bông lúa + tên sản phẩm) thay vì để vỡ layout.

## Nên tối ưu trước khi đưa lên

Ảnh gốc khá nặng, khách dùng 3G sẽ đợi lâu. Nên resize bề ngang còn ~1200px và
nén xuống dưới 200KB mỗi ảnh (dùng squoosh.app hoặc tinyjpg.com). Cân nhắc xuất
thêm bản `.webp` nếu muốn nhẹ hơn nữa.
