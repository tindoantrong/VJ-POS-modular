# Ảnh sản phẩm cho trang bán hàng

## File đang dùng (đã tối ưu, lên git)

| File | Nội dung | Dung lượng |
|---|---|---|
| `st25-banner.jpg` | Banner ST25 — bao gạo + tô cơm | ~248 KB |
| `st25-grains.jpg` | Ảnh ghép hạt gạo ST25 | ~184 KB |
| `st500-banner.jpg` | Banner ST500 — bao gạo + tô cơm | ~228 KB |
| `st500-grains.jpg` | Ảnh ghép hạt gạo ST500 | ~164 KB |

Đường dẫn khai báo ở `assets/js/shop/products.js` (`img` và `imgGrains`).

## File gốc (KHÔNG lên git)

Bản PNG gốc `st25_bao_bi.png`, `st25_chi_tiet.png`, `st_500_bao_bi.png`,
`st500_chi_tiet.png` nằm trong `.gitignore` — **8.4 MB** cho 4 ảnh là quá nặng để
đưa vào lịch sử git vĩnh viễn, trong khi bản JPG đã tối ưu chỉ tốn 824 KB mà nhìn
không khác gì trên màn hình điện thoại.

File gốc vẫn còn trên máy, chỉ là không commit. Muốn đưa cả gốc lên git thì xoá
dòng tương ứng trong `.gitignore`.

## Nén lại khi thay ảnh mới

```bash
cd assets/img
ffmpeg -y -i ANH_GOC.png -vf scale=1200:-2 -q:v 4 ten-file-dich.jpg
```

`-q:v` từ 2 (đẹp nhất, nặng) tới 6 (nhẹ, bắt đầu thấy vỡ). 4 là mức cân bằng tốt.

> ⚠️ Đừng gõ `convert` trên máy Windows này — `convert.exe` của Windows là công cụ
> đổi FAT sang NTFS, không phải ImageMagick. Dùng `ffmpeg`.

## Thiếu ảnh thì sao?

Trang vẫn chạy bình thường: thẻ sản phẩm tự hiện khối thay thế (biểu tượng bông lúa
+ tên sản phẩm) thay vì để vỡ layout. Xem `onError` trong `shop/ui/ProductCard.js`.
