# HUST Secure Wallet - Ví Tiền Điện Tử Với Web Crypto API

> **Đề tài môn học:** Xây dựng cơ chế mã hóa dữ liệu end-to-end trong ứng dụng web – Demo với Web Crypto API

# Danh sách thành viên:
**Dương Khải Anh - MSV:22810350161 - Xây dựng backend, mã hoá end-to-end**
**Hoàng Hải Dương - MSV:22810310242 - Xây dựng frontend, mã hoá end-to-end**

## 🎯 Tổng Quan Dự Án

HUST Secure Wallet là một ví tiền điện tử nâng cao với tích hợp đầy đủ Web Crypto API để đảm bảo bảo mật end-to-end. Dự án này demo thực tế việc áp dụng các thuật toán mã hóa hiện đại vào ứng dụng web.

### 🔐 Các Thuật Toán Bảo Mật
- **AES-256-GCM**: Mã hóa private key
- **PBKDF2**: Key derivation từ password  
- **ECDH**: Key exchange an toàn
- **HMAC-SHA256**: Digital signatures
- **SHA-256**: Hash functions

## 🚀 Quick Start

### 1. Khởi động Hardhat Node
```bash
cd d:\Workspace\MyWallet
npx hardhat node
```

### 2. Triển khai Smart Contract
```bash
npx hardhat run --network localhost scripts/deploy.js
```

### 3. Khởi động Secure Wallet
```bash
cd d:\Workspace\MyWallet\frontend
npm run dev
# Tự động mở http://localhost:3000/secure-index.html
```

## 📋 Yêu Cầu Hệ Thống

- Node.js (v14 trở lên)
- Python 3 (cho local server)
- Trình duyệt hỗ trợ Web Crypto API (Chrome, Firefox, Edge)
- Hardhat local network (http://127.0.0.1:8545)

## 🎮 Các Lựa Chạy Khác nhau

```bash
# Secure Wallet (Production)
npm run dev              # Mặc định: mở secure-index.html
npm run dev-secure       # Mở secure wallet

# Standard Wallet (Legacy)  
npm run dev-standard     # Mở ví tiêu chuẩn

# Educational Demo
npm run dev-demo         # Mở crypto demo page

# Chỉ mở trang (không start server)
npm run open-secure      # Mở secure wallet
npm run open-standard    # Mở ví tiêu chuẩn
npm run open-demo        # Mở crypto demo
```

## 🔐 Tính Năng Bảo Mật

### Secure Wallet (`secure-index.html`)
- ✅ **Password-Based Encryption**: PBKDF2 + AES-256-GCM
- ✅ **Recovery Phrases**: 12-word backup phrases
- ✅ **Secure Backup**: Encrypted wallet export
- ✅ **Key Management**: Secure key generation & storage
- ✅ **Modern UI**: Professional security indicators

### Standard Wallet (`index.html`)
- 🔄 **Basic Features**: Tạo/import ví thông thường
- 🔄 **No Encryption**: Private key plaintext storage
- 🔄 **Educational**: Dùng để so sánh security

### Crypto Demo (`crypto-demo.html`)
- 🎓 **Interactive Learning**: Test từng algorithm
- 🎓 **Performance Metrics**: Thời gian xử lý real-time
- 🎓 **Code Examples**: Integration guide
- 🎓 **Security Best Practices**: Educational content

## 📁 Cấu Trúc Dự Án

```
d:\Workspace\MyWallet\
├── frontend/
│   ├── js/
│   │   ├── app.js              # Base wallet functionality
│   │   └── secure-wallet.js    # Web Crypto API implementation
│   ├── index.html              # Standard wallet (legacy)
│   ├── secure-index.html       # Secure wallet (production)
│   ├── crypto-demo.html        # Educational demo
│   └── package.json            # NPM scripts & metadata
├── contracts/                  # Smart contracts
├── scripts/                    # Deployment scripts
├── deployments/                # Contract deployment info
└── README.md                   # This file
```

## 🎓 Context Môn Học

### Problem Statement
- **Current Issue**: Ví tiền điện tử thường lưu private key plaintext
- **Security Risk**: Vulnerable to malware, keyloggers, data breaches
- **Solution**: Implement end-to-end encryption với Web Crypto API

### Implementation Approach
1. **Theory**: Study Web Crypto API standards
2. **Practice**: Implement secure wallet with real algorithms  
3. **Demo**: Interactive educational page
4. **Comparison**: Show security improvements

### Academic Value
- ✅ **Real-world Application**: Không chỉ là demo
- ✅ **Advanced Cryptography**: Industry-standard algorithms
- ✅ **Complete Implementation**: Theory → Practice
- ✅ **Security Focus**: Proper key management
- ✅ **Performance Analysis**: Real-world metrics

## 🔧 Technical Implementation

### Web Crypto API Integration
```javascript
// AES-256-GCM Encryption
const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
);

// PBKDF2 Key Derivation  
const derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations: 200000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
);
```

### Security Features
- **Zero-Knowledge**: Server không có access đến plaintext
- **Client-Side Encryption**: Tất cả encryption happen trong browser
- **Secure Random**: Crypto-safe random number generation
- **Memory Management**: Proper cleanup of sensitive data

## 🧪 Testing & Demo

### Test Scenarios
1. **Create Secure Wallet**: Test password-based encryption
2. **Import Secure Wallet**: Test decryption & validation
3. **Send/Receive Transactions**: Test with encrypted keys
4. **Secure Backup**: Test encrypted wallet export
5. **Performance**: Measure encryption/decryption times

### Demo Flow
1. **Show Problem**: `index.html` (vulnerable wallet)
2. **Show Theory**: `crypto-demo.html` (algorithm demos)
3. **Show Solution**: `secure-index.html` (secure wallet)

## 🛠️ Khắc Phục Sự Cố

### Common Issues
1. **"Cannot connect to provider"**
   - Đảm bảo Hardhat node đang chạy
   - Kiểm tra RPC URL: `http://127.0.0.1:8545`

2. **"Encryption failed"**
   - Kiểm tra browser hỗ trợ Web Crypto API
   - Đảm bảo password strength đủ mạnh

3. **"Invalid password"**
   - PBKDF2 iterations có thể cao → cần thời gian
   - Kiểm tra salt generation

4. **"Performance issues"**
   - PBKDF2 200K iterations có thể chậm trên mobile
   - Có thể giảm xuống 100K cho demo

### Browser Compatibility
- ✅ Chrome 37+
- ✅ Firefox 34+  
- ✅ Edge 12+
- ❌ Safari (limited support)

## 📊 Performance Metrics

Tham khảo `crypto-demo.html` để xem real-world performance:
- **AES-256 Encryption**: ~5-15ms
- **PBKDF2 (200K iterations)**: ~500-2000ms  
- **ECDH Key Exchange**: ~10-30ms
- **Digital Signature**: ~2-8ms

## 🎯 Next Steps

### For Production
- [ ] Implement quantum-resistant algorithms
- [ ] Add multi-signature support
- [ ] Implement hardware wallet integration
- [ ] Add audit logging

### For Academic Enhancement  
- [ ] Zero-knowledge proofs demo
- [ ] Secure multi-party computation
- [ ] Advanced threat modeling
- [ ] Performance optimization

## 🤝 Hỗ Trợ

### Academic Context
- **Môn học**: Phát triển phần mềm web an toàn
- **Giảng viên**: [Tên giảng viên]
- **Đề tài**: Xây dựng cơ chế mã hóa dữ liệu end-to-end

### Technical Support
- **Issues**: Report trên project repository
- **Documentation**: Xem `crypto-demo.html` for detailed examples
- **Security**: Follow best practices in Security section

## 📜 Giấy Phép

MIT License - Developed for educational purposes at HUST

---

**🚀 Ready to demo! Run `npm run dev` to start the secure wallet experience!**
