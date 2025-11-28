# HUST Wallet Frontend

Frontend đơn giản cho HUST Wallet sử dụng HTML + Vanilla JavaScript + Tailwind CSS.

## Cấu trúc

```
frontend/
├── index.html          # Trang chính
├── js/
│   └── app.js         # Logic ứng dụng
├── package.json       # Metadata
└── README.md          # Tài liệu
```

## Chạy ứng dụng

### Bước 1: Khởi động Hardhat Node
```bash
cd d:\Workspace\MyWallet
npm run chain
```

### Bước 2: Deploy HUSTCoin (terminal mới)
```bash
cd d:\Workspace\MyWallet
npm run deploy
```

### Bước 3: Chạy Frontend (terminal mới)
```bash
cd d:\Workspace\MyWallet\frontend
npm run dev
```

Mở trình duyệt và truy cập: http://localhost:3000

## Tính năng

- ✅ Tạo ví mới
- ✅ Nhập ví từ Private Key
- ✅ Xem số dư ETH và HUST
- ✅ Gửi giao dịch
- ✅ Nhận tiền (QR Code)
- ✅ Lịch sử giao dịch
- ✅ Cài đặt ví

## Lưu ý

- Ví được lưu trong localStorage (chỉ cho phát triển)
- Luôn lưu Private Key ở nơi an toàn
- Không bao giờ chia sẻ Private Key
