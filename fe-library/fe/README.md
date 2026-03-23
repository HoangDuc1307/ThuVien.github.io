# Library Management System - Angular

Ứng dụng quản lý thư viện được chuyển đổi từ HTML/CSS/JS sang Angular, giữ nguyên cấu trúc và giao diện.

## Cấu trúc dự án

```
src/
├── app/
│   ├── components/
│   │   ├── home/              # Trang chủ
│   │   ├── book/              # Trang danh sách sách
│   │   ├── login/              # Trang đăng nhập
│   │   ├── register/           # Trang đăng ký
│   │   ├── management/         # Trang quản lý (index.html)
│   │   └── shared/
│   │       ├── header/         # Header component
│   │       └── footer/         # Footer component
│   ├── services/
│   │   └── library.service.ts  # Service quản lý Books, Members, Loans
│   ├── app.component.ts        # Root component
│   └── app.routes.ts            # Routing configuration
├── index.html
├── main.ts
└── styles.css
```

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Chạy ứng dụng:
```bash
npm start
```

3. Mở trình duyệt tại: `http://localhost:4200`

## Các trang

- `/home` - Trang chủ với sách nổi bật
- `/books` - Danh sách tất cả sách
- `/login` - Đăng nhập
- `/register` - Đăng ký
- `/management` - Quản lý sách, thành viên, mượn/trả

## Tính năng

- ✅ Quản lý sách (thêm, sửa, xóa)
- ✅ Quản lý thành viên (thêm, sửa, xóa)
- ✅ Quản lý mượn/trả sách
- ✅ Báo cáo thống kê
- ✅ Tìm kiếm sách
- ✅ Responsive design

## Công nghệ sử dụng

- Angular 17 (Standalone Components)
- TypeScript
- Tailwind CSS (CDN)
- RxJS (Observables)

