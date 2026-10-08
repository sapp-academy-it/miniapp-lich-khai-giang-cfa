# Lịch khai giảng CFA

Mini web app nội bộ cho tư vấn viên SAPP tra cứu lớp CFA sắp khai giảng bằng dữ liệu thật từ OPS UAT.

## Chức năng

- Đăng nhập bằng tài khoản OPS.
- Lọc Level 1/2/3, hình thức học và khu vực.
- Chỉ đọc `POST /auth/login`, `POST /auth/rotate`, `GET /classes`, `GET /facilities`.
- Token chỉ giữ trong bộ nhớ trình duyệt.
- Không lưu mật khẩu và không sửa dữ liệu OPS.

## GitHub Pages

Trang dự kiến:

`https://sapp-academy-it.github.io/miniapp-lich-khai-giang-cfa/`

Trong repo, mở **Settings → Pages**, chọn **Source: GitHub Actions**. OPS UAT cần cho phép origin:

`https://sapp-academy-it.github.io`

Workflow `.github/workflows/pages.yml` sẽ tự triển khai lại khi nhánh `main` có thay đổi.

## Quy ước dữ liệu

- `ONLINE`: Record Online.
- `LIVE_ONLINE`: Live Online.
- `OFFLINE`: Face to face.
- Level được đọc lần lượt từ môn học, tên khóa, danh sách level, tên lớp và mã lớp.
- Lớp chưa đọc được Level vẫn hiển thị khi chưa chọn bộ lọc Level.
- Lớp online không gắn cơ sở vẫn hiển thị khi lọc khu vực.

## Cập nhật

Sửa các file HTML/CSS/JavaScript rồi đẩy lên `main`. Workflow Pages sẽ tự đăng lại. Chỉ đổi `js/config.js` sang production khi đã được phê duyệt.
