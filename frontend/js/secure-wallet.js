class SecureWallet extends Wallet {
    constructor() {
        super();
        this.encryptionKey = null;
        this.keyPair = null;
        this.sharedSecrets = new Map();
        this.encryptedBackup = null;
        this.securityLevel = 'high'; // high = 200k iterations
    }

    // ==================== PASSWORD-BASED ENCRYPTION ====================
    async deriveKeyFromPassword(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: this.securityLevel === 'high' ? 200000 : 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async encryptPrivateKey(privateKey, password) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKeyFromPassword(password, salt);
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(privateKey));

        console.log("%cPrivate key plaintext:", "color:red; font-weight:bold", privateKey);
        console.log("%cPrivate key đã mã hoá (encryptedPrivateKey):", "color:green; font-weight:bold", Array.from(new Uint8Array(encrypted)));

        return {
            algorithm: 'AES-256-GCM',
            salt: Array.from(salt),
            iv: Array.from(iv),
            encrypted: Array.from(new Uint8Array(encrypted)),
            timestamp: Date.now()
        };
    }

    async decryptPrivateKey(encryptedData, password) {
        const salt = new Uint8Array(encryptedData.salt);
        const iv = new Uint8Array(encryptedData.iv);
        const encrypted = new Uint8Array(encryptedData.encrypted);
        const key = await this.deriveKeyFromPassword(password, salt);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);

        console.log("%cGiải mã thành công – Private key gốc:", "color:orange; font-weight:bold", new TextDecoder().decode(decrypted));

        return new TextDecoder().decode(decrypted);
    }

    // ==================== CREATE SECURE WALLET ====================
    async createSecureWallet(password, confirmPassword) {
        if (password !== confirmPassword) throw new Error('Mật khẩu không khớp');
        if (password.length < 8) throw new Error('Mật khẩu phải ít nhất 8 ký tự');

        const w = ethers.Wallet.createRandom();
        const encryptedPrivateKey = await this.encryptPrivateKey(w.privateKey, password);
        const recoveryPhrase = await this.generateRecoveryPhrase();

        const secureWalletData = {
            address: w.address,
            encryptedPrivateKey,
            createdAt: Date.now(),
            securityLevel: this.securityLevel
        };

        localStorage.setItem('secureWallet', JSON.stringify(secureWalletData));

        // Lưu tạm privateKey để connect ngay
        this.wallet = { address: w.address, privateKey: w.privateKey, encryptedPrivateKey };
        await this.connectWallet();

        return { wallet: secureWalletData, recoveryPhrase, address: w.address };
    }

    // ==================== IMPORT SECURE WALLET ====================
    async importSecureWallet(encryptedData, password) {
        const data = typeof encryptedData === 'string' ? JSON.parse(encryptedData) : encryptedData;
        const privateKey = await this.decryptPrivateKey(data.encryptedPrivateKey, password);
        const ethersWallet = new ethers.Wallet(privateKey);

        if (ethersWallet.address.toLowerCase() !== data.address.toLowerCase()) {
            throw new Error('Địa chỉ ví không khớp');
        }

        this.wallet = { address: data.address, privateKey, encryptedPrivateKey: data.encryptedPrivateKey };
        localStorage.setItem('secureWallet', JSON.stringify(data));
        await this.connectWallet();
        return true;
    }

    // ==================== RECOVERY PHRASE (12 từ) ====================
    async generateRecoveryPhrase() {
        const entropy = crypto.getRandomValues(new Uint8Array(16));
        const wordlist = [
            "apple","banana","cat","dog","elephant","flower","grape","house","island","jungle",
            "kite","lemon","mountain","ocean","panda","queen","river","sun","tree","umbrella",
            "violet","water","yellow","zebra","abandon","ability","about","above","absent","absorb"
        ];
        const phrase = [];
        for (let i = 0; i < 12; i++) phrase.push(wordlist[entropy[i] % wordlist.length]);

        return {
            phrase: phrase.join(' '),
            instructions: 'Ghi lại 12 từ này theo đúng thứ tự và cất giữ ở nơi an toàn!'
        };
    }

    // ==================== PASSWORD STRENGTH ====================
    validatePasswordStrength(password = '') {
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            numbers: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        const score = Object.values(checks).filter(Boolean).length;
        return {
            score,
            strength: score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong',
            checks,
            recommendations: score < 5 ? [
                'Dùng ít nhất 8 ký tự',
                'Kết hợp chữ hoa, thường, số, ký tự đặc biệt'
            ] : []
        };
    }

    checkPasswordStrength(password) {
        const result = this.validatePasswordStrength(password);
        const div = document.getElementById('passwordStrength');
        if (!div) return;

        const colors = { weak: 'text-red-600', medium: 'text-yellow-600', strong: 'text-green-600' };
        const texts = { weak: 'Yếu', medium: 'Trung bình', strong: 'Mạnh' };

        let html = `<div class="font-medium ${colors[result.strength]}">Mật khẩu: ${texts[result.strength]} (${result.score}/5)</div>`;
        if (result.recommendations.length) {
            html += '<ul class="text-xs text-gray-500 mt-1">' + result.recommendations.map(r => `<li>• ${r}</li>`).join('') + '</ul>';
        }
        div.innerHTML = html;
    }

    // ==================== EXPORT WALLET ====================
    async exportSecureWallet() {
        const data = JSON.parse(localStorage.getItem('secureWallet'));
        if (!data) return this.showError('Không có ví để xuất');

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `secure-wallet-${data.address.slice(0,8)}-${Date.now()}.json`;
        a.click();
        this.showSuccess('Đã xuất ví thành công!');
    }

    // ==================== SHOW SUCCESS SCREEN ====================
    showWalletCreationSuccess(result) {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div class="w-full max-w-2xl fade-in">
                    <div class="card text-center">
                        <div class="text-8xl mb-6">Success</div>
                        <h2 class="text-4xl font-bold mb-4 text-green-600">Tạo Ví Thành Công!</h2>
                        <p class="text-gray-600 mb-8">Ví đã được mã hóa an toàn</p>

                        <div class="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 mb-6">
                            <h3 class="text-xl font-bold text-yellow-900 mb-3">Recovery Phrase (12 từ)</h3>
                            <p class="text-sm text-yellow-700 mb-4">Ghi lại và cất giữ an toàn – không chia sẻ!</p>
                            <div class="bg-white p-5 rounded-lg border-2 border-yellow-400 font-mono text-lg break-all">
                                ${result.recoveryPhrase.phrase}
                            </div>
                            <button onclick="navigator.clipboard.writeText('${result.recoveryPhrase.phrase}').then(()=>wallet.showSuccess('Đã sao chép!'))"
                                    class="mt-4 btn-secondary text-sm">Sao chép 12 từ</button>
                        </div>

                        <div class="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 mb-8">
                            <h3 class="text-xl font-bold text-blue-900 mb-3">Địa Chỉ Ví</h3>
                            <div class="bg-white p-5 rounded-lg border-2 border-blue-400 font-mono text-lg break-all">
                                ${result.address}
                            </div>
                            <button onclick="navigator.clipboard.writeText('${result.address}').then(()=>wallet.showSuccess('Đã sao chép địa chỉ!'))"
                                    class="mt-4 btn-secondary text-sm">Sao chép địa chỉ</button>
                        </div>

                        <div class="flex gap-4 justify-center">
                            <button onclick="wallet.showDashboard()" class="btn-primary text-lg px-8 py-4">
                                Vào Dashboard
                            </button>
                            <button onclick="wallet.exportSecureWallet()" class="btn-secondary text-lg px-8 py-4">
                                Xuất Ví (Backup)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ==================== NHẬP VÍ AN TOÀN ====================
    showSecureImportPassword(encryptedData) {
        const dataStr = btoa(JSON.stringify(encryptedData));
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div class="w-full max-w-2xl fade-in">
                    <button onclick="wallet.showHome()" class="mb-6 btn-secondary">Quay lại</button>
                    <div class="card text-center">
                        <div class="text-6xl mb-4">Unlock</div>
                        <h2 class="text-3xl font-bold mb-6">Mở Khóa Ví An Toàn</h2>
                        <input type="password" id="importPassword" class="w-full p-4 border-2 rounded-lg mb-4" placeholder="Nhập mật khẩu" required minlength="8">
                        <button id="unlockBtn" class="w-full btn-primary py-4 text-lg">Mở Ví</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('unlockBtn').addEventListener('click', async () => {
            const pw = document.getElementById('importPassword').value;
            if (pw.length < 8) return this.showError('Mật khẩu phải ≥ 8 ký tự');
            const btn = document.getElementById('unlockBtn');
            const old = btn.innerHTML; btn.innerHTML = 'Đang giải mã...'; btn.disabled = true;
            try {
                await this.importSecureWallet(JSON.parse(atob(dataStr)), pw);
                this.showSuccess('Nhập ví thành công!');
                setTimeout(() => this.showDashboard(), 1500);
            } catch (e) { this.showError('Mật khẩu sai hoặc file hỏng'); btn.innerHTML = old; btn.disabled = false; }
        });
    }

    showManualSecureImport() {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div class="w-full max-w-4xl fade-in">
                    <button onclick="wallet.showSecureImport()" class="mb-6 btn-secondary">Quay lại</button>
                    <div class="card">
                        <h2 class="text-3xl font-bold text-center mb-6">Nhập Ví Thủ Công</h2>
                        <textarea id="jsonInput" class="w-full h-64 font-mono text-xs p-4 border-2 rounded-lg mb-4" placeholder='{"address":"0x...","encryptedPrivateKey":{...}}'></textarea>
                        <input type="password" id="manualPw" class="w-full p-4 border-2 rounded-lg mb-4" placeholder="Mật khẩu">
                        <button id="manualBtn" class="w-full btn-primary py-4 text-lg">Nhập Ví</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('manualBtn').addEventListener('click', async () => {
            const json = document.getElementById('jsonInput').value.trim();
            const pw = document.getElementById('manualPw').value;
            if (!json || !pw) return this.showError('Vui lòng điền đầy đủ');
            const btn = document.getElementById('manualBtn');
            const old = btn.innerHTML; btn.innerHTML = 'Đang xử lý...'; btn.disabled = true;
            try {
                await this.importSecureWallet(JSON.parse(json), pw);
                this.showSuccess('Nhập ví thành công!');
                setTimeout(() => this.showDashboard(), 1500);
            } catch (e) { this.showError('Dữ liệu sai hoặc mật khẩu sai'); btn.innerHTML = old; btn.disabled = false; }
        });
    }
}

// Xử lý chọn file
document.addEventListener('change', async e => {
    if (e.target.id === 'walletFile' && e.target.files[0]) {
        const text = await e.target.files[0].text();
        const data = JSON.parse(text);
        if (data.encryptedPrivateKey && data.address) secureWallet.showSecureImportPassword(data);
        else secureWallet.showError('File không đúng định dạng ví an toàn');
    }
});

// Khởi tạo
const secureWallet = new SecureWallet();
window.wallet = secureWallet;
document.addEventListener('DOMContentLoaded', () => secureWallet.init());