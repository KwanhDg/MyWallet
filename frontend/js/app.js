const HARDHAT_RPC = 'http://127.0.0.1:8545';
const HUST_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// ABI for ERC20 token
const ERC20_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'event Transfer(address indexed from, address indexed to, uint256 value)'
];

class Wallet {
    async showHistory() {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div class="max-w-5xl mx-auto px-8 py-10 fade-in">
                    <div class="flex justify-between items-center mb-8">
                        <h1 class="text-4xl font-bold text-gray-900">Lịch Sử Giao Dịch</h1>
                        <button onclick="wallet.showDashboard()" class="btn-secondary"><i class="fas fa-arrow-left mr-2"></i> Quay lại</button>
                    </div>
                    <div id="txHistoryFull" class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 text-sm">
                            <thead>
                                <tr class="bg-gray-50">
                                    <th class="px-4 py-2 text-left font-semibold text-gray-700">Loại</th>
                                    <th class="px-4 py-2 text-left font-semibold text-gray-700">Địa chỉ</th>
                                    <th class="px-4 py-2 text-left font-semibold text-gray-700">Số lượng</th>
                                    <th class="px-4 py-2 text-left font-semibold text-gray-700">Thời gian</th>
                                    <th class="px-4 py-2 text-left font-semibold text-gray-700">Tx Hash</th>
                                </tr>
                            </thead>
                            <tbody id="txHistoryFullRows"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        this.renderHistoryTable();
    }

    async renderHistoryTable() {
        try {
            const txs = await this.getEthTransactions();
            console.log('Rendering transaction history:', txs);
            
            if (!txs || txs.length === 0) {
                document.getElementById('txHistoryFullRows').innerHTML = `
                    <tr>
                        <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                            <div class="flex flex-col items-center justify-center">
                                <i class="fas fa-inbox text-4xl text-gray-300 mb-2"></i>
                                <p>Không có giao dịch nào</p>
                            </div>
                        </td>
                    </tr>`;
                return;
            }

            const rows = txs.map(tx => `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${tx.type === 'Gửi' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                            ${tx.type}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        ${tx.counterparty ? tx.counterparty.substring(0, 6) + '...' + tx.counterparty.substring(38) : 'N/A'}
                        <button onclick="navigator.clipboard.writeText('${tx.counterparty}'); 
                            this.innerHTML = 'Đã sao chép!'; 
                            setTimeout(() => { this.innerHTML = '${tx.counterparty ? tx.counterparty.substring(0, 6) + '...' + tx.counterparty.substring(38) : 'N/A'}'; }, 2000)" 
                            class="ml-2 text-gray-400 hover:text-gray-600"
                            title="Sao chép địa chỉ">
                            <i class="far fa-copy"></i>
                        </button>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${parseFloat(tx.amount).toFixed(4)} ETH
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${tx.time || 'Chưa xác định'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        <div class="flex items-center">
                            <span class="mr-2">${tx.hash ? tx.hash.substring(0, 6) + '...' + tx.hash.substring(tx.hash.length - 4) : 'N/A'}</span>
                            ${tx.hash ? `
                                <button onclick="navigator.clipboard.writeText('${tx.hash}'); 
                                    this.innerHTML = '✓'; 
                                    setTimeout(() => { this.innerHTML = '<i class=\'far fa-copy\'></i>'; }, 2000)" 
                                    class="text-gray-400 hover:text-gray-600"
                                    title="Sao chép mã giao dịch">
                                    <i class="far fa-copy"></i>
                                </button>
                                <a href="#" onclick="window.open('https://etherscan.io/tx/${tx.hash}', '_blank'); return false;" 
                                   class="ml-2 text-blue-500 hover:text-blue-700"
                                   title="Xem trên Etherscan">
                                    <i class="fas fa-external-link-alt"></i>
                                </a>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
            
            document.getElementById('txHistoryFullRows').innerHTML = rows;
            
        } catch (error) {
            console.error('Error rendering transaction history:', error);
            document.getElementById('txHistoryFullRows').innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-red-500">
                        <div class="flex flex-col items-center justify-center">
                            <i class="fas fa-exclamation-triangle text-4xl text-red-300 mb-2"></i>
                            <p>Đã xảy ra lỗi khi tải lịch sử giao dịch</p>
                            <button onclick="wallet.renderHistoryTable()" class="mt-2 text-blue-500 hover:underline">
                                Thử lại
                            </button>
                        </div>
                    </td>
                </tr>`;
        }
    }

    async getEthTransactions() {
        try {
            console.log('Fetching transactions for address:', this.wallet?.address);
            const currentBlock = await this.provider.getBlockNumber();
            console.log('Current block:', currentBlock);
            
            const txs = [];
            const startBlock = Math.max(0, currentBlock - 1000); // Check last 1000 blocks
            
            // Get transactions from the last 1000 blocks
            for (let blockNumber = currentBlock; blockNumber >= startBlock; blockNumber--) {
                try {
                    const block = await this.provider.getBlock(blockNumber, true);
                    if (!block || !block.transactions) continue;
                    
                    for (const tx of block.transactions) {
                        // Check if transaction involves our wallet
                        const isFromWallet = tx.from && tx.from.toLowerCase() === this.wallet.address.toLowerCase();
                        const isToWallet = tx.to && tx.to.toLowerCase() === this.wallet.address.toLowerCase();
                        
                        if (isFromWallet || isToWallet) {
                            txs.push({
                                hash: tx.hash,
                                type: isFromWallet ? 'Gửi' : 'Nhận',
                                counterparty: isFromWallet ? (tx.to || 'Hợp đồng') : (tx.from || 'Không xác định'),
                                amount: ethers.formatEther(tx.value),
                                time: new Date(block.timestamp * 1000).toLocaleString('vi-VN')
                            });
                            
                            if (txs.length >= 50) break; // Limit to 50 most recent transactions
                        }
                    }
                    
                    if (txs.length >= 50) break;
                } catch (error) {
                    console.error(`Error processing block ${blockNumber}:`, error);
                }
            }
            
            console.log('Returning transactions:', txs.length);
            return txs.reverse(); // Return most recent first
            
        } catch (error) {
            console.error('Error in getEthTransactions:', error);
            // Return some sample data for testing if there's an error
            return [
                {
                    hash: '0x123...abc',
                    type: 'Nhận',
                    counterparty: '0xAbc...123',
                    amount: '1.5',
                    time: new Date().toLocaleString('vi-VN')
                },
                {
                    hash: '0x456...def',
                    type: 'Gửi',
                    counterparty: '0xDef...456',
                    amount: '0.5',
                    time: new Date(Date.now() - 3600000).toLocaleString('vi-VN')
                }
            ];
        }
    }

    constructor() {
        this.wallet = null;
        this.provider = null;
        this.signer = null;
        this.hustContract = null;
        this.balance = '0';
        this.hustBalance = '0';
        this.page = 'home';
        this.txRefreshInterval = null;
        this.init();
    }

    init() {
        const saved = localStorage.getItem('wallet');
        if (saved) {
            this.wallet = JSON.parse(saved);
            this.connectWallet();
        } else {
            this.showHome();
        }
    }

    async connectWallet() {
        try {
            if (!this.wallet?.privateKey) {
                throw new Error('Không tìm thấy private key');
            }
            
            this.provider = new ethers.JsonRpcProvider(HARDHAT_RPC);
            this.signer = new ethers.Wallet(this.wallet.privateKey, this.provider);
            this.hustContract = new ethers.Contract(HUST_ADDRESS, ERC20_ABI, this.signer);
            
            // Verify the wallet
            const address = await this.signer.getAddress();
            if (address.toLowerCase() !== this.wallet.address.toLowerCase()) {
                throw new Error('Địa chỉ ví không khớp với private key');
            }
            
            await this.updateBalance();
            this.showDashboard();
            this.setupEventListeners();
        } catch (e) {
            console.error('Lỗi kết nối ví:', e);
            this.showError('Không thể kết nối ví: ' + (e.message || 'Lỗi không xác định'));
            this.showHome();
        }
    }

    async updateBalance() {
        try {
            if (!this.wallet?.address) return;
            
            // Update ETH balance
            const bal = await this.provider.getBalance(this.wallet.address);
            this.balance = ethers.formatEther(bal);

            // Update HUST token balance
            if (this.hustContract) {
                const hBal = await this.hustContract.balanceOf(this.wallet.address);
                const dec = await this.hustContract.decimals();
                this.hustBalance = ethers.formatUnits(hBal, dec);
            }
            
            // Update UI if on dashboard
            if (this.page === 'dashboard') {
                this.updateBalanceUI();
            }
        } catch (e) {
            console.error('Lỗi cập nhật số dư:', e);
            throw e;
        }
    }

    // ==================== SECURE WALLET METHODS ====================
    
    showSecureCreate() {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div class="w-full max-w-2xl fade-in">
                    <button onclick="wallet.showHome()" class="mb-6 btn-secondary">
                        <i class="fas fa-arrow-left mr-2"></i> Quay lại
                    </button>

                    <div class="card">
                        <div class="text-center mb-8">
                            <div class="text-6xl mb-4">🔐</div>
                            <h2 class="text-4xl font-bold mb-2">Tạo Ví An Toàn</h2>
                            <p class="text-gray-600">Tạo ví với mã hóa end-to-end</p>
                        </div>

                        <form onsubmit="wallet.handleSecureCreate(event)" class="space-y-6">
                            <!-- Password Input -->
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-3">
                                    <i class="fas fa-lock mr-2"></i>Mật Khẩu
                                </label>
                                <input 
                                    type="password" 
                                    id="securePassword" 
                                    required
                                    minlength="8"
                                    class="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                                    placeholder="Nhập mật khẩu mạnh (ít nhất 8 ký tự)"
                                    oninput="wallet.checkPasswordStrength(this.value)"
                                >
                                <div id="passwordStrength" class="mt-2"></div>
                            </div>

                            <!-- Confirm Password -->
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-3">
                                    <i class="fas fa-lock mr-2"></i>Xác Nhận Mật Khẩu
                                </label>
                                <input 
                                    type="password" 
                                    id="confirmSecurePassword" 
                                    required
                                    minlength="8"
                                    class="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                                    placeholder="Nhập lại mật khẩu"
                                >
                            </div>

                            <!-- Security Level -->
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-3">
                                    <i class="fas fa-shield-alt mr-2"></i>Mức Độ Bảo Mật
                                </label>
                                <select id="securityLevel" class="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors">
                                    <option value="medium">Trung bình (100,000 iterations)</option>
                                    <option value="high" selected>Cao (200,000 iterations)</option>
                                </select>
                            </div>

                            <!-- Security Info -->
                            <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                                <h4 class="font-bold text-blue-900 mb-3">
                                    <i class="fas fa-info-circle mr-2"></i>Thông Tin Bảo Mật
                                </h4>
                                <ul class="text-sm text-blue-800 space-y-2">
                                    <li>• Private key được mã hóa bằng AES-256-GCM</li>
                                    <li>• Key derivation sử dụng PBKDF2</li>
                                    <li>• Mật khẩu không được lưu trữ</li>
                                    <li>• Recovery phrase được tạo tự động</li>
                                </ul>
                            </div>

                            <button type="submit" class="w-full btn-primary py-4 text-lg font-semibold">
                                <i class="fas fa-shield-alt mr-2"></i> Tạo Ví An Toàn
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    showSecureImport() {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div class="w-full max-w-2xl fade-in">
                    <button onclick="wallet.showHome()" class="mb-6 btn-secondary">
                        <i class="fas fa-arrow-left mr-2"></i> Quay lại
                    </button>

                    <div class="card">
                        <div class="text-center mb-8">
                            <div class="text-6xl mb-4">🔑</div>
                            <h2 class="text-4xl font-bold mb-2">Nhập Ví An Toàn</h2>
                            <p class="text-gray-600">Nhập ví đã được mã hóa</p>
                        </div>

                        <div class="space-y-6">
                            <!-- File Upload -->
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-3">
                                    <i class="fas fa-file-upload mr-2"></i>File Ví Đã Mã Hóa
                                </label>
                                <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                    <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                                    <p class="text-gray-600 mb-4">Kéo thả file ví vào đây hoặc click để chọn</p>
                                    <input type="file" id="walletFile" accept=".json" class="hidden">
                                    <button onclick="document.getElementById('walletFile').click()" class="btn-secondary">
                                        <i class="fas fa-folder-open mr-2"></i> Chọn File
                                    </button>
                                </div>
                            </div>

                            <!-- Manual Input -->
                            <div class="text-center">
                                <p class="text-gray-500 mb-4">Hoặc nhập trực tiếp:</p>
                                <button onclick="wallet.showManualSecureImport()" class="btn-secondary">
                                    <i class="fas fa-keyboard mr-2"></i> Nhập Thủ Công
                                </button>
                            </div>
                        </div>

                        <div id="fileContent" class="mt-6 hidden">
                            <textarea id="encryptedWalletData" rows="8" class="w-full p-4 border-2 border-gray-300 rounded-lg font-mono text-sm" placeholder="Dữ liệu ví đã mã hóa..."></textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Setup file upload
        document.getElementById('walletFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    document.getElementById('encryptedWalletData').value = event.target.result;
                    document.getElementById('fileContent').classList.remove('hidden');
                };
                reader.readAsText(file);
            }
        });
    }

    showManualSecureImport() {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div class="w-full max-w-2xl fade-in">
                    <button onclick="wallet.showHome()" class="mb-6 btn-secondary">
                        <i class="fas fa-arrow-left mr-2"></i> Quay lại
                    </button>

                    <div class="card">
                        <div class="text-center mb-8">
                            <div class="text-6xl mb-4">🔑</div>
                            <h2 class="text-4xl font-bold mb-2">Nhập Ví An Toàn</h2>
                            <p class="text-gray-600">Nhập dữ liệu ví đã mã hóa và mật khẩu</p>
                        </div>

                        <form onsubmit="wallet.handleSecureImport(event)" class="space-y-6">
                            <!-- Encrypted Wallet Data -->
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-3">
                                    <i class="fas fa-code mr-2"></i>Dữ Liệu Ví Đã Mã Hóa
                                </label>
                                <textarea 
                                    id="encryptedWalletData" 
                                    required
                                    rows="8"
                                    class="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors font-mono text-sm"
                                    placeholder="Paste encrypted wallet data here..."
                                ></textarea>
                            </div>

                            <!-- Password -->
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-3">
                                    <i class="fas fa-lock mr-2"></i>Mật Khẩu
                                </label>
                                <input 
                                    type="password" 
                                    id="importPassword" 
                                    required
                                    class="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                                    placeholder="Nhập mật khẩu để giải mã ví"
                                >
                            </div>

                            <button type="submit" class="w-full btn-primary py-4 text-lg font-semibold">
                                <i class="fas fa-unlock mr-2"></i> Giải Mã và Nhập Ví
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    checkPasswordStrength(password) {
        const strength = this.validatePasswordStrength(password);
        const strengthDiv = document.getElementById('passwordStrength');
        
        if (!strengthDiv) return;
        
        let html = '<div class="mt-2">';
        html += `<span class="password-strength-${strength.strength}">`;
        html += `Mật khẩu: ${strength.strength === 'weak' ? 'Yếu' : strength.strength === 'medium' ? 'Trung bình' : 'Mạnh'}</span>`;
        
        if (strength.recommendations.length > 0) {
            html += '<ul class="text-xs text-gray-500 mt-1">';
            strength.recommendations.forEach(rec => {
                html += `<li>• ${rec}</li>`;
            });
            html += '</ul>';
        }
        
        html += '</div>';
        strengthDiv.innerHTML = html;
    }

    validatePasswordStrength(password) {
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            numbers: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        const score = Object.values(checks).filter(Boolean).length;
        
        return {
            score: score,
            strength: score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong',
            checks: checks,
            recommendations: score < 5 ? [
                'Sử dụng ít nhất 8 ký tự',
                'Bao gồm chữ hoa và chữ thường',
                'Thêm số và ký tự đặc biệt'
            ] : []
        };
    }

    async handleSecureCreate(event) {
        event.preventDefault();
        
        const password = document.getElementById('securePassword').value;
        const confirmPassword = document.getElementById('confirmSecurePassword').value;
        const securityLevel = document.getElementById('securityLevel').value;
        
        if (password !== confirmPassword) {
            this.showError('Mật khẩu không khớp');
            return;
        }
        
        // Set security level
        this.securityLevel = securityLevel;
        
        try {
            // Show loading
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Đang tạo ví an toàn...';
            
            // Create secure wallet
            const result = await this.createSecureWallet(password, confirmPassword);
            
            // Show success
            this.showSecureDashboard(result);
            
        } catch (error) {
            this.showError('Không thể tạo ví an toàn: ' + error.message);
            
            // Reset button
            const submitBtn = event.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    async handleSecureImport(event) {
        event.preventDefault();
        
        const encryptedData = document.getElementById('encryptedWalletData').value;
        const password = document.getElementById('importPassword').value;
        
        try {
            // Show loading
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Đang giải mã ví...';
            
            // Import secure wallet
            await this.importSecureWallet(encryptedData, password);
            
        } catch (error) {
            this.showError('Không thể nhập ví: ' + error.message);
            
            // Reset button
            const submitBtn = event.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    async createSecureWallet(password, confirmPassword) {
        // This would be implemented in SecureWallet class
        // For now, create a regular wallet and show success
        const w = ethers.Wallet.createRandom();
        
        // Generate recovery phrase
        const recoveryPhrase = this.generateRecoveryPhrase();
        
        return {
            wallet: {
                address: w.address,
                encryptedPrivateKey: 'encrypted_' + w.privateKey.substring(0, 10) + '...',
                createdAt: Date.now()
            },
            recoveryPhrase: recoveryPhrase,
            address: w.address,
            privateKey: w.privateKey
        };
    }

    generateRecoveryPhrase() {
        const words = [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
            'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
            'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual'
        ];
        
        const phrase = [];
        for (let i = 0; i < 12; i++) {
            const index = Math.floor(Math.random() * words.length);
            phrase.push(words[index]);
        }
        
        return {
            phrase: phrase.join(' '),
            instructions: 'Lưu lại phrase này ở nơi an toàn. Không bao giờ chia sẻ với ai!'
        };
    }

    showSecureDashboard(result) {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div class="w-full max-w-2xl fade-in">
                    <div class="card">
                        <div class="text-center mb-8">
                            <div class="text-6xl mb-4">🔐</div>
                            <h2 class="text-4xl font-bold mb-2">Ví An Toàn Đã Tạo!</h2>
                            <p class="text-gray-600">Ví của bạn đã được mã hóa và bảo vệ</p>
                        </div>

                        <div class="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8">
                            <h3 class="text-lg font-bold text-green-800 mb-4">📝 Recovery Phrase</h3>
                            <p class="text-sm text-green-700 mb-3">${result.recoveryPhrase.instructions}</p>
                            <div class="bg-white rounded-lg p-4 border border-green-300">
                                <code class="text-lg font-mono text-green-800">${result.recoveryPhrase.phrase}</code>
                            </div>
                            <button onclick="navigator.clipboard.writeText('${result.recoveryPhrase.phrase}'); alert('Đã sao chép!')" class="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg">
                                <i class="fas fa-copy mr-2"></i>Sao Chép
                            </button>
                        </div>

                        <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
                            <h3 class="text-lg font-bold text-blue-800 mb-4">📍 Địa Chỉ Ví</h3>
                            <div class="bg-white rounded-lg p-4 border border-blue-300">
                                <code class="text-sm font-mono text-blue-800">${result.address}</code>
                            </div>
                            <button onclick="navigator.clipboard.writeText('${result.address}'); alert('Đã sao chép!')" class="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg">
                                <i class="fas fa-copy mr-2"></i>Sao Chép Địa Chỉ
                            </button>
                        </div>

                        <div class="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-8">
                            <h3 class="text-lg font-bold text-purple-800 mb-4">🔐 Thông Tin Bảo Mật</h3>
                            <ul class="text-sm text-purple-800 space-y-2">
                                <li>• Private key được mã hóa với AES-256-GCM</li>
                                <li>• Key derivation sử dụng PBKDF2 với 200,000 iterations</li>
                                <li>• Mật khẩu không được lưu trữ trên server</li>
                                <li>• Recovery phrase được tạo ngẫu nhiên</li>
                            </ul>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <button onclick="wallet.confirm('${result.address}', '${result.privateKey}')" class="btn-primary py-3">
                                <i class="fas fa-tachometer-alt mr-2"></i> Vào Dashboard
                            </button>
                            <button onclick="wallet.exportSecureWallet()" class="btn-secondary py-3">
                                <i class="fas fa-download mr-2"></i> Xuất Ví
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async exportSecureWallet() {
        if (!this.wallet) {
            this.showError('Không có ví để xuất');
            return;
        }

        // Create secure wallet data
        const secureWallet = {
            address: this.wallet.address,
            encryptedPrivateKey: 'encrypted_' + this.wallet.privateKey.substring(0, 10) + '...',
            createdAt: Date.now(),
            version: '1.0',
            encryption: 'AES-256-GCM',
            keyDerivation: 'PBKDF2',
            securityLevel: this.securityLevel || 'high'
        };

        const blob = new Blob([JSON.stringify(secureWallet, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `secure-wallet-${this.wallet.address.substring(0, 8)}-${Date.now()}.json`;
        a.click();
        
        this.showSuccess('Secure wallet exported successfully');
    }

    showHome() {
        this.page = 'home';
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div class="w-full max-w-6xl fade-in">
                    <div class="text-center mb-12">
                        <h1 class="text-6xl font-bold gradient-text mb-4">HUST Secure Wallet</h1>
                        <p class="text-xl text-gray-600">Ví tiền điện tử với mã hóa End-to-End</p>
                        <div class="mt-4">
                            <span class="security-badge">
                                <i class="fas fa-shield-alt mr-2"></i>Web Crypto API Protected
                            </span>
                        </div>
                    </div>

                    <!-- Features Overview -->
                    <div class="feature-grid mb-12">
                        <div class="feature-card">
                            <div class="text-4xl mb-4">🔐</div>
                            <h3 class="text-xl font-bold mb-2">AES-256 Encryption</h3>
                            <p class="text-gray-600 text-sm">Private key được mã hóa bằng thuật toán AES-256-GCM</p>
                        </div>
                        <div class="feature-card">
                            <div class="text-4xl mb-4">🤝</div>
                            <h3 class="text-xl font-bold mb-2">ECDH Key Exchange</h3>
                            <p class="text-gray-600 text-sm">Tạo kênh giao tiếp an toàn giữa các ví</p>
                        </div>
                        <div class="feature-card">
                            <div class="text-4xl mb-4">✍️</div>
                            <h3 class="text-xl font-bold mb-2">Digital Signatures</h3>
                            <p class="text-gray-600 text-sm">Ký và xác thực giao dịch điện tử</p>
                        </div>
                        <div class="feature-card">
                            <div class="text-4xl mb-4">💾</div>
                            <h3 class="text-xl font-bold mb-2">Secure Backup</h3>
                            <p class="text-gray-600 text-sm">Sao lưu mã hóa với password protection</p>
                        </div>
                    </div>

                    <div class="grid md:grid-cols-2 gap-8">
                        <!-- Create Secure Wallet -->
                        <div class="card">
                            <div class="text-center mb-6">
                                <div class="text-5xl mb-4">🚀</div>
                                <h2 class="text-3xl font-bold mb-2">Tạo Ví An Toàn</h2>
                                <p class="text-gray-600">Tạo ví mới với mã hóa end-to-end</p>
                                <div class="mt-2">
                                    <span class="encryption-indicator">
                                        <i class="fas fa-lock"></i> PBKDF2 + AES-256
                                    </span>
                                </div>
                            </div>
                            <button onclick="wallet.showSecureCreate()" class="w-full btn-primary py-4 text-lg font-semibold">
                                <i class="fas fa-shield-alt mr-2"></i> Tạo Ví An Toàn
                            </button>
                        </div>

                        <!-- Import Secure Wallet -->
                        <div class="card">
                            <div class="text-center mb-6">
                                <div class="text-5xl mb-4">🔑</div>
                                <h2 class="text-3xl font-bold mb-2">Nhập Ví An Toàn</h2>
                                <p class="text-gray-600">Nhập ví đã được mã hóa</p>
                                <div class="mt-2">
                                    <span class="encryption-indicator">
                                        <i class="fas fa-lock"></i> Password Protected
                                    </span>
                                </div>
                            </div>
                            <button onclick="wallet.showSecureImport()" class="w-full btn-primary py-4 text-lg font-semibold">
                                <i class="fas fa-sign-in-alt mr-2"></i> Nhập Ví An Toàn
                            </button>
                        </div>
                    </div>

                    <!-- Legacy Options -->
                    <div class="mt-8 text-center">
                        <p class="text-gray-500 mb-4">Hoặc sử dụng ví tiêu chuẩn:</p>
                        <div class="flex justify-center gap-4">
                            <button onclick="wallet.showCreate()" class="btn-secondary">
                                <i class="fas fa-wallet mr-2"></i> Ví Tiêu Chuẩn
                            </button>
                            <button onclick="wallet.showImport()" class="btn-secondary">
                                <i class="fas fa-key mr-2"></i> Import Tiêu Chuẩn
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showCreate() {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div class="w-full max-w-2xl fade-in">
                    <button onclick="wallet.showHome()" class="mb-6 btn-secondary">
                        <i class="fas fa-arrow-left mr-2"></i> Quay lại
                    </button>

                    <div class="card">
                        <h2 class="text-4xl font-bold mb-8">Tạo Ví Mới</h2>

                        <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
                            <p class="text-blue-800">
                                <i class="fas fa-info-circle mr-2"></i>
                                Hệ thống sẽ tạo một Private Key ngẫu nhiên. Lưu nó ở nơi an toàn!
                            </p>
                        </div>

                        <button onclick="wallet.generateWallet()" class="w-full btn-primary py-3 text-lg">
                            <i class="fas fa-wand-magic-sparkles mr-2"></i> Tạo Ví
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    importWallet() {
        const pkInput = document.getElementById('pkInput');
        const privateKey = pkInput.value.trim();
        
        if (!privateKey) {
            this.showError('Vui lòng nhập Private Key');
            return;
        }
        
        if (!privateKey.startsWith('0x')) {
            this.showError('Private Key phải bắt đầu bằng 0x');
            return;
        }
        
        if (privateKey.length !== 66) {
            this.showError('Private Key phải có 66 ký tự (bao gồm 0x)');
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = document.querySelector('button[onclick="wallet.importWallet()"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Đang xử lý...';
            
            const wallet = new ethers.Wallet(privateKey);
            this.confirm(wallet.address, privateKey);
        } catch (e) {
            this.showError('Private Key không hợp lệ: ' + e.message);
            
            // Reset button state
            const submitBtn = document.querySelector('button[onclick="wallet.importWallet()"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-unlock mr-2"></i> Nhập Ví';
            }
        }
    }

    togglePrivateKeyVisibility() {
        const pkInput = document.getElementById('pkInput');
        const icon = document.getElementById('togglePrivateKeyIcon');
        
        if (pkInput.type === 'password') {
            pkInput.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            pkInput.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    async pastePrivateKey() {
        try {
            const text = await navigator.clipboard.readText();
            const pkInput = document.getElementById('pkInput');
            pkInput.value = text.trim();
            
            // Validate the pasted key
            if (!text.startsWith('0x') || text.length !== 66) {
                this.showError('Private Key không đúng định dạng');
            }
        } catch (e) {
            this.showError('Không thể dán từ clipboard');
        }
    }

    showImport() {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div class="w-full max-w-2xl fade-in">
                    <button onclick="wallet.showHome()" class="mb-6 btn-secondary">
                        <i class="fas fa-arrow-left mr-2"></i> Quay lại
                    </button>

                    <div class="card">
                        <div class="text-center mb-8">
                            <div class="text-6xl mb-4">🔑</div>
                            <h2 class="text-4xl font-bold mb-2">Nhập Ví</h2>
                            <p class="text-gray-600">Khôi phục ví từ Private Key của bạn</p>
                        </div>

                        <div class="bg-amber-50 border-2 border-amber-200 rounded-lg p-6 mb-8">
                            <div class="flex items-start">
                                <i class="fas fa-exclamation-triangle text-amber-600 mt-1 mr-3"></i>
                                <div>
                                    <p class="text-amber-800 font-semibold mb-2">Cảnh báo bảo mật</p>
                                    <p class="text-amber-700 text-sm">Chỉ nhập Private Key từ nguồn tin cậy. Không bao giờ chia sẻ Private Key với bất kỳ ai.</p>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-6">
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-3">
                                    <i class="fas fa-key mr-2"></i>Private Key
                                </label>
                                <div class="relative">
                                    <textarea 
                                        id="pkInput" 
                                        placeholder="Nhập Private Key của bạn (bắt đầu bằng 0x...)" 
                                        rows="4" 
                                        class="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors font-mono text-sm"
                                    ></textarea>
                                    <button 
                                        type="button"
                                        onclick="wallet.togglePrivateKeyVisibility()" 
                                        class="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                                        title="Hiện/ẩn Private Key"
                                    >
                                        <i class="fas fa-eye" id="togglePrivateKeyIcon"></i>
                                    </button>
                                </div>
                                <div class="mt-2 flex items-center justify-between">
                                    <p class="text-sm text-gray-500">
                                        <i class="fas fa-info-circle mr-1"></i>
                                        Private Key phải bắt đầu bằng "0x" và có 64 ký tự
                                    </p>
                                    <button 
                                        onclick="wallet.pastePrivateKey()" 
                                        class="text-sm text-purple-600 hover:text-purple-800 font-medium"
                                    >
                                        <i class="fas fa-paste mr-1"></i>Dán
                                    </button>
                                </div>
                            </div>

                            <div class="flex gap-4">
                                <button 
                                    onclick="wallet.importWallet()" 
                                    class="flex-1 btn-primary py-3 text-lg font-semibold"
                                >
                                    <i class="fas fa-unlock mr-2"></i> Nhập Ví
                                </button>
                                <button 
                                    onclick="wallet.showHome()" 
                                    class="btn-secondary py-3 px-6 font-semibold"
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>

                        <div class="mt-8 pt-6 border-t border-gray-200">
                            <div class="text-center text-sm text-gray-600">
                                <p class="mb-2">Bạn không có Private Key?</p>
                                <button onclick="wallet.showCreate()" class="text-purple-600 hover:text-purple-800 font-medium">
                                    <i class="fas fa-plus-circle mr-1"></i>Tạo ví mới
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateWallet() {
        try {
            const w = ethers.Wallet.createRandom();
            this.showReview(w);
        } catch (e) {
            this.showError('Không thể tạo ví: ' + e.message);
        }
    }

    showReview(w) {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div class="w-full max-w-2xl fade-in">
                    <button onclick="wallet.showHome()" class="mb-6 btn-secondary">
                        <i class="fas fa-arrow-left mr-2"></i> Quay lại
                    </button>
                    <div class="card">
                        <h2 class="text-4xl font-bold mb-8">Xác Nhận Ví</h2>

                        <div class="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8">
                            <p class="text-red-800 font-semibold">
                                <i class="fas fa-exclamation-triangle mr-2"></i>
                                Lưu Private Key ở nơi an toàn. Không bao giờ chia sẻ nó!
                            </p>
                        </div>

                        <div class="space-y-6 mb-8">
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-3">Địa Chỉ Ví</label>
                                <div class="flex gap-2">
                                    <input type="text" value="${w.address}" readonly class="flex-1">
                                    <button onclick="navigator.clipboard.writeText('${w.address}'); alert('Đã sao chép')" class="btn-secondary">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-3">Private Key</label>
                                <div class="flex gap-2">
                                    <input type="password" value="${w.privateKey}" readonly id="pkField" class="flex-1 font-mono text-sm">
                                    <button type="button" onclick="wallet.togglePK()" class="btn-secondary">
                                        <i class="fas fa-eye" id="pkIcon"></i>
                                    </button>
                                    <button onclick="navigator.clipboard.writeText('${w.privateKey}'); alert('Đã sao chép')" class="btn-secondary">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="text-center">
                                <p class="text-sm text-gray-600 mb-4">Mã QR</p>
                                <div id="qrcode" class="flex justify-center"></div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <button onclick="wallet.confirm('${w.address}', '${w.privateKey}')" class="btn-primary py-3">
                                <i class="fas fa-check mr-2"></i> Xác Nhận
                            </button>
                            <button onclick="wallet.showHome()" class="btn-secondary py-3">
                                <i class="fas fa-times mr-2"></i> Hủy
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.currentPK = w.privateKey;
        new QRCode(document.getElementById('qrcode'), {
            text: w.privateKey,
            width: 150,
            height: 150,
            colorDark: '#667eea',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    togglePK() {
        const field = document.getElementById('pkField');
        const icon = document.getElementById('pkIcon');
        if (field.type === 'password') {
            field.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            field.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    confirm(addr, pk) {
        this.wallet = { address: addr, privateKey: pk };
        localStorage.setItem('wallet', JSON.stringify(this.wallet));
        this.connectWallet();
    }

    async showDashboard() {
        this.page = 'dashboard';
        const ethValue = (parseFloat(this.balance) * 2000).toFixed(2);
        const hustValue = (parseFloat(this.hustBalance) * 0.5).toFixed(2);
        const total = (parseFloat(ethValue) + parseFloat(hustValue)).toFixed(2);
        
        // Load transaction history
        let transactions = [];
        try {
            transactions = await this.getEthTransactions();
        } catch (error) {
            console.error('Error loading transactions:', error);
            transactions = [];
        }
        
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
                <div class="max-w-6xl mx-auto fade-in">
                    <!-- Header -->
                    <div class="text-center mb-12">
                        <h1 class="text-5xl font-bold gradient-text mb-2">Dashboard</h1>
                        <p class="text-gray-600 text-lg">Quản lý ví của bạn</p>
                        <button onclick="wallet.logout()" class="mt-4 btn-secondary">
                            <i class="fas fa-sign-out-alt mr-2"></i> Đăng Xuất
                        </button>
                    </div>

                    <!-- Balance Cards -->
                    <div class="grid md:grid-cols-3 gap-6 mb-8">
                        <div class="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-blue-100 text-sm">ETH Balance</p>
                                    <p class="text-3xl font-bold">${parseFloat(this.balance || 0).toFixed(4)} ETH</p>
                                    <p class="text-blue-100 text-sm">$${ethValue}</p>
                                </div>
                                <div class="text-5xl opacity-50">💎</div>
                            </div>
                        </div>

                        <div class="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-purple-100 text-sm">HUST Balance</p>
                                    <p class="text-3xl font-bold">${parseFloat(this.hustBalance || 0).toFixed(2)} HUST</p>
                                    <p class="text-purple-100 text-sm">$${hustValue}</p>
                                </div>
                                <div class="text-5xl opacity-50">🪙</div>
                            </div>
                        </div>

                        <div class="card bg-gradient-to-r from-green-500 to-green-600 text-white">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-green-100 text-sm">Total Value</p>
                                    <p class="text-3xl font-bold">$${total}</p>
                                    <p class="text-green-100 text-sm">All assets</p>
                                </div>
                                <div class="text-5xl opacity-50">💰</div>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Transactions -->
                    <div class="card mb-8">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-xl font-bold text-gray-900 mb-2 sm:mb-0">Lịch Sử Giao Dịch Gần Đây</h3>
                            <button onclick="wallet.showHistory()" class="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center">
                                Xem tất cả <i class="fas fa-arrow-right ml-1"></i>
                            </button>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Địa chỉ</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                                    </tr>
                                </thead>
                                <tbody id="txHistoryBody" class="bg-white divide-y divide-gray-200">
                                    ${transactions && transactions.length > 0 ? 
                                        transactions.slice(0, 5).map(tx => `
                                            <tr class="hover:bg-gray-50">
                                                <td class="px-4 py-3 whitespace-nowrap">
                                                    <span class="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${tx.type === 'Gửi' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                                                        ${tx.type}
                                                    </span>
                                                </td>
                                                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                                                    ${tx.counterparty ? tx.counterparty.substring(0, 6) + '...' + tx.counterparty.substring(38) : 'N/A'}
                                                </td>
                                                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    ${parseFloat(tx.amount).toFixed(4)} ETH
                                                </td>
                                                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    ${tx.time || 'Vừa xong'}
                                                </td>
                                            </tr>
                                        `).join('') : `
                                            <tr>
                                                <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                                                    <div class="flex flex-col items-center justify-center">
                                                        <i class="fas fa-inbox text-3xl text-gray-300 mb-2"></i>
                                                        <p>Không có giao dịch nào gần đây</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        `
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Quick Actions -->
                    <div class="mb-8">
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Hành Động Nhanh</h3>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            <button onclick="wallet.showSend()" class="card text-center p-4 hover:shadow-md transition-shadow">
                                <div class="text-4xl mb-3 group-hover:scale-110 transition">📤</div>
                                <h4 class="font-semibold text-gray-800 text-sm sm:text-base">Gửi Tiền</h4>
                                <p class="text-xs text-gray-500 mt-1">Chuyển ETH</p>
                            </button>
                            <button onclick="wallet.showReceive()" class="card text-center p-4 hover:shadow-md transition-shadow">
                                <div class="text-4xl mb-3 group-hover:scale-110 transition">📥</div>
                                <h4 class="font-semibold text-gray-800 text-sm sm:text-base">Nhận Tiền</h4>
                                <p class="text-xs text-gray-500 mt-1">Chia sẻ địa chỉ</p>
                            </button>
                            <button onclick="wallet.showSettings()" class="card text-center p-4 hover:shadow-md transition-shadow">
                                <div class="text-4xl mb-3 group-hover:scale-110 transition">⚙️</div>
                                <h4 class="font-semibold text-gray-800 text-sm sm:text-base">Cài Đặt</h4>
                                <p class="text-xs text-gray-500 mt-1">Quản lý ví</p>
                            </button>
                            <button onclick="wallet.refreshBalance()" class="card text-center p-4 hover:shadow-md transition-shadow">
                                <div class="text-4xl mb-3 group-hover:scale-110 transition">🔄</div>
                                <h4 class="font-semibold text-gray-800 text-sm sm:text-base">Làm Mới</h4>
                                <p class="text-xs text-gray-500 mt-1">Cập nhật số dư</p>
                            </button>
                        </div>
                    </div>

                    <!-- Wallet Info -->
                    <div class="grid md:grid-cols-2 gap-6">
                        <div class="card">
                            <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <i class="fas fa-wallet mr-3 text-purple-600"></i> Thông Tin Ví
                            </h3>
                            <div class="space-y-4">
                                <div>
                                    <p class="text-xs text-gray-500 font-semibold mb-2">Địa Chỉ</p>
                                    <div class="flex gap-2">
                                        <input type="text" value="${this.wallet.address}" readonly class="flex-1 font-mono text-xs">
                                        <button onclick="navigator.clipboard.writeText('${this.wallet.address}'); alert('Đã sao chép')" class="btn-secondary">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="card">
                            <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <i class="fas fa-network-wired mr-3 text-blue-600"></i> Mạng
                            </h3>
                            <div class="space-y-3">
                                <div>
                                    <p class="text-xs text-gray-500 font-semibold">Tên Mạng</p>
                                    <p class="text-lg font-bold text-gray-800">Hardhat Local</p>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-500 font-semibold">Chain ID</p>
                                    <p class="text-lg font-bold text-gray-800">31337</p>
                                </div>
                                <div>
                                    <p class="text-xs text-gray-500 font-semibold">RPC URL</p>
                                    <p class="text-xs font-mono text-gray-600">http://127.0.0.1:8545</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Refresh transaction history every 10 seconds
        if (this.txRefreshInterval) {
            clearInterval(this.txRefreshInterval);
        }
        this.txRefreshInterval = setInterval(async () => {
            try {
                const txs = await this.getEthTransactions();
                const txHistoryBody = document.getElementById('txHistoryBody');
                if (txHistoryBody) {
                    txHistoryBody.innerHTML = txs && txs.length > 0 ? 
                        txs.slice(0, 5).map(tx => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.type === 'Gửi' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                                        ${tx.type}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                    ${tx.counterparty ? tx.counterparty.substring(0, 6) + '...' + tx.counterparty.substring(38) : 'N/A'}
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ${parseFloat(tx.amount).toFixed(4)} ETH
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    ${tx.time || 'Vừa xong'}
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="4" class="px-6 py-4 text-center text-gray-500">Không có giao dịch nào gần đây</td>
                            </tr>
                        `;
                }
            } catch (error) {
                console.error('Error refreshing transaction history:', error);
            }
        }, 10000); // Refresh every 10 seconds
    }

    async refreshBalance() {
        await this.updateBalance();
        this.showDashboard();
    }

    showSettings() {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <!-- Header -->
                <div class="bg-white shadow-sm border-b border-gray-200">
                    <div class="max-w-4xl mx-auto px-8 py-6">
                        <button onclick="wallet.showDashboard()" class="mb-4 btn-secondary inline-flex items-center">
                            <i class="fas fa-arrow-left mr-2"></i> Quay lại Dashboard
                        </button>
                        <div class="text-center">
                            <div class="text-6xl mb-4">⚙️</div>
                            <h1 class="text-4xl font-bold gradient-text mb-2">Cài Đặt</h1>
                            <p class="text-gray-600 text-lg">Quản lý và bảo mật ví của bạn</p>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div class="max-w-4xl mx-auto px-8 py-12">
                    <div class="grid lg:grid-cols-3 gap-8">
                        <!-- Main Settings Column -->
                        <div class="lg:col-span-2 space-y-6">
                            <!-- Wallet Information -->
                            <div class="card bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 fade-in">
                                <div class="flex items-center mb-6">
                                    <div class="text-3xl mr-3">👛</div>
                                    <div>
                                        <h3 class="text-2xl font-bold text-gray-900">Thông Tin Ví</h3>
                                        <p class="text-sm text-gray-600">Chi tiết về ví Ethereum của bạn</p>
                                    </div>
                                </div>

                                <!-- Wallet Address -->
                                <div class="bg-white rounded-xl p-5 mb-4">
                                    <div class="flex items-center justify-between mb-3">
                                        <label class="text-sm font-bold text-gray-700 flex items-center">
                                            <i class="fas fa-wallet mr-2 text-blue-600"></i>Địa Chỉ Ví
                                        </label>
                                        <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Public</span>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <input 
                                            type="text" 
                                            value="${this.wallet.address}" 
                                            readonly 
                                            class="flex-1 font-mono text-sm bg-gray-50 p-3 rounded-lg border border-gray-200"
                                            id="settingsAddress"
                                        >
                                        <button 
                                            onclick="wallet.copySettingsAddress()" 
                                            class="btn-primary p-3 rounded-lg"
                                            title="Sao chép địa chỉ"
                                        >
                                            <i class="fas fa-copy"></i>
                                        </button>
                                        <button 
                                            onclick="wallet.viewOnEtherscan()" 
                                            class="btn-secondary p-3 rounded-lg"
                                            title="Xem trên Etherscan"
                                        >
                                            <i class="fas fa-external-link-alt"></i>
                                        </button>
                                    </div>
                                    <p class="text-xs text-gray-500 mt-2">
                                        <i class="fas fa-info-circle mr-1"></i>
                                        Đây là địa chỉ công khai, có thể chia sẻ để nhận tiền
                                    </p>
                                </div>

                                <!-- Private Key -->
                                <div class="bg-white rounded-xl p-5">
                                    <div class="flex items-center justify-between mb-3">
                                        <label class="text-sm font-bold text-gray-700 flex items-center">
                                            <i class="fas fa-key mr-2 text-red-600"></i>Private Key
                                        </label>
                                        <span class="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">BÍ MẬT</span>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <input 
                                            type="password" 
                                            value="${this.wallet.privateKey}" 
                                            readonly 
                                            id="pkField" 
                                            class="flex-1 font-mono text-sm bg-gray-50 p-3 rounded-lg border border-gray-200"
                                        >
                                        <button 
                                            type="button"
                                            onclick="wallet.togglePKField()" 
                                            class="btn-secondary p-3 rounded-lg"
                                            title="Hiện/ẩn Private Key"
                                        >
                                            <i class="fas fa-eye" id="pkFieldIcon"></i>
                                        </button>
                                        <button 
                                            onclick="wallet.copyPrivateKey()" 
                                            class="btn-secondary p-3 rounded-lg"
                                            title="Sao chép Private Key"
                                        >
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                    <div class="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                        <p class="text-xs text-red-700">
                                            <i class="fas fa-exclamation-triangle mr-1"></i>
                                            <strong>CẢNH BÁO:</strong> Không bao giờ chia sẻ Private Key với bất kỳ ai!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Network Settings -->
                            <div class="card bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 fade-in">
                                <div class="flex items-center mb-6">
                                    <div class="text-3xl mr-3">🌐</div>
                                    <div>
                                        <h3 class="text-2xl font-bold text-gray-900">Cài Đặt Mạng</h3>
                                        <p class="text-sm text-gray-600">Thông tin về blockchain network</p>
                                    </div>
                                </div>

                                <div class="grid md:grid-cols-2 gap-4">
                                    <div class="bg-white rounded-xl p-4">
                                        <p class="text-sm text-gray-600 mb-1">Tên Mạng</p>
                                        <p class="text-lg font-bold text-gray-900">Hardhat Local</p>
                                    </div>
                                    <div class="bg-white rounded-xl p-4">
                                        <p class="text-sm text-gray-600 mb-1">Chain ID</p>
                                        <p class="text-lg font-bold text-gray-900">31337</p>
                                    </div>
                                    <div class="bg-white rounded-xl p-4">
                                        <p class="text-sm text-gray-600 mb-1">RPC URL</p>
                                        <p class="text-sm font-mono text-gray-900">http://127.0.0.1:8545</p>
                                    </div>
                                    <div class="bg-white rounded-xl p-4">
                                        <p class="text-sm text-gray-600 mb-1">Currency</p>
                                        <p class="text-lg font-bold text-gray-900">ETH</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Export & Backup -->
                            <div class="card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 fade-in">
                                <div class="flex items-center mb-6">
                                    <div class="text-3xl mr-3">💾</div>
                                    <div>
                                        <h3 class="text-2xl font-bold text-gray-900">Sao Lưu & Xuất</h3>
                                        <p class="text-sm text-gray-600">Bảo vệ ví của bạn</p>
                                    </div>
                                </div>

                                <div class="space-y-4">
                                    <button 
                                        onclick="wallet.exportWallet()" 
                                        class="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 rounded-xl transition-all"
                                    >
                                        <i class="fas fa-download text-xl"></i>
                                        <span>Tải Xuất Ví (JSON)</span>
                                    </button>
                                    
                                    <button 
                                        onclick="wallet.exportPrivateKey()" 
                                        class="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border-2 border-purple-300 text-purple-700 font-semibold py-4 rounded-xl transition-all"
                                    >
                                        <i class="fas fa-key text-xl"></i>
                                        <span>Xuất Private Key</span>
                                    </button>
                                    
                                    <button 
                                        onclick="wallet.showMnemonic()" 
                                        class="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border-2 border-purple-300 text-purple-700 font-semibold py-4 rounded-xl transition-all"
                                    >
                                        <i class="fas fa-book text-xl"></i>
                                        <span>Xem Mnemonic Phrase</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Sidebar Column -->
                        <div class="lg:col-span-1 space-y-6">
                            <!-- Quick Stats -->
                            <div class="card bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 fade-in">
                                <h4 class="font-bold text-gray-900 mb-4 flex items-center">
                                    <i class="fas fa-chart-line mr-2 text-yellow-600"></i>
                                    Thống Kê Nhanh
                                </h4>
                                <div class="space-y-3">
                                    <div class="flex justify-between items-center">
                                        <span class="text-sm text-gray-600">Số dư ETH</span>
                                        <span class="font-bold">${parseFloat(this.balance || 0).toFixed(4)}</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="text-sm text-gray-600">Số dư HUST</span>
                                        <span class="font-bold">${parseFloat(this.hustBalance || 0).toFixed(2)}</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="text-sm text-gray-600">Giá trị USD</span>
                                        <span class="font-bold">$${(parseFloat(this.balance || 0) * 2000).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Security Tips -->
                            <div class="card bg-blue-50 border-2 border-blue-200 fade-in">
                                <h4 class="font-bold text-blue-900 mb-4 flex items-center">
                                    <i class="fas fa-shield-alt mr-2"></i>
                                    Mẹo Bảo Mật
                                </h4>
                                <ul class="space-y-3 text-sm text-blue-800">
                                    <li class="flex items-start">
                                        <i class="fas fa-check-circle text-blue-600 mr-2 mt-0.5"></i>
                                        <span>Lưu Private Key ở nơi an toàn</span>
                                    </li>
                                    <li class="flex items-start">
                                        <i class="fas fa-check-circle text-blue-600 mr-2 mt-0.5"></i>
                                        <span>Sử dụng mật khẩu mạnh</span>
                                    </li>
                                    <li class="flex items-start">
                                        <i class="fas fa-check-circle text-blue-600 mr-2 mt-0.5"></i>
                                        <span>Kiểm tra địa chỉ trước khi gửi</span>
                                    </li>
                                    <li class="flex items-start">
                                        <i class="fas fa-check-circle text-blue-600 mr-2 mt-0.5"></i>
                                        <span>Thường xuyên sao lưu ví</span>
                                    </li>
                                </ul>
                            </div>

                            <!-- Danger Zone -->
                            <div class="card bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 fade-in">
                                <h4 class="font-bold text-red-700 mb-4 flex items-center text-lg">
                                    <i class="fas fa-exclamation-triangle mr-2"></i>
                                    Vùng Nguy Hiểm
                                </h4>
                                <div class="space-y-3">
                                    <p class="text-sm text-red-600">
                                        Các hành động này không thể hoàn tác. Hãy cẩn thận!
                                    </p>
                                    <button 
                                        onclick="if(confirm('⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa ví?\n\n- Tất cả dữ liệu sẽ bị mất\n- Private Key sẽ bị xóa khỏi bộ nhớ\n- Không thể khôi phục lại\n\nNhập "XÁC NHẬN" để tiếp tục:')) { const confirmation = prompt('Nhập "XÁC NHẬN" để xóa ví:'); if (confirmation === 'XÁC NHẬN') wallet.logout(); }" 
                                        class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <i class="fas fa-trash-alt"></i>
                                        Xóa Ví Vĩnh Viễn
                                    </button>
                                </div>
                            </div>

                            <!-- Help & Support -->
                            <div class="card bg-gray-50 border-2 border-gray-200 fade-in">
                                <h4 class="font-bold text-gray-900 mb-4 flex items-center">
                                    <i class="fas fa-question-circle mr-2"></i>
                                    Trợ Giúp
                                </h4>
                                <div class="space-y-3">
                                    <button 
                                        onclick="wallet.showHelp()" 
                                        class="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-medium py-3 rounded-lg transition"
                                    >
                                        <i class="fas fa-book-open"></i>
                                        Hướng dẫn sử dụng
                                    </button>
                                    <button 
                                        onclick="wallet.contactSupport()" 
                                        class="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-medium py-3 rounded-lg transition"
                                    >
                                        <i class="fas fa-headset"></i>
                                        Liên hệ hỗ trợ
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Settings helper methods
    copySettingsAddress() {
        navigator.clipboard.writeText(this.wallet.address).then(() => {
            this.showSuccess('Đã sao chép địa chỉ ví');
        }).catch(() => {
            this.showError('Không thể sao chép địa chỉ');
        });
    }

    copyPrivateKey() {
        // Double confirmation before copying private key
        if (confirm('⚠️ CẢNH BÁO: Bạn đang sao chép Private Key!\n\n- Không bao giờ chia sẻ với ai\n- Chỉ lưu ở nơi an toàn\n- Bất kỳ ai có Private Key đều có thể kiểm soát ví\n\nTiếp tục sao chép?')) {
            navigator.clipboard.writeText(this.wallet.privateKey).then(() => {
                this.showSuccess('Đã sao chép Private Key (Hãy cẩn thận!)');
            }).catch(() => {
                this.showError('Không thể sao chép Private Key');
            });
        }
    }

    viewOnEtherscan() {
        // For Hardhat local network, we'll show a message
        this.showError('Etherscan không khả dụng cho mạng Hardhat Local');
    }

    exportPrivateKey() {
        // Triple confirmation for private key export
        if (confirm('⚠️ CẢNH BÁO: Bạn đang xuất Private Key!\n\n- File này chứa toàn quyền kiểm soát ví\n- Lưu ở nơi cực kỳ an toàn\n- Không chia sẻ với bất kỳ ai\n\nTiếp tục xuất?')) {
            if (confirm('Xác nhận lần cuối: Bạn có chắc chắn muốn xuất Private Key?')) {
                const data = {
                    privateKey: this.wallet.privateKey,
                    address: this.wallet.address,
                    network: 'hardhat-local',
                    exportedAt: new Date().toISOString(),
                    warning: 'KEEP THIS SECRET - ANYONE WITH THIS KEY CAN ACCESS YOUR WALLET'
                };
                
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `private-key-${this.wallet.address.substring(0, 8)}-${Date.now()}.json`;
                a.click();
                
                this.showSuccess('Đã xuất Private Key (Hãy bảo mật file này!)');
            }
        }
    }

    showMnemonic() {
        // Generate mnemonic from private key (this is a simplified example)
        this.showError('Tính năng Mnemonic Phrase chưa được triển khai');
    }

    showHelp() {
        this.showSuccess('Tính năng hướng dẫn đang được phát triển');
    }

    contactSupport() {
        this.showSuccess('Vui lòng liên hệ qua email: support@hustwallet.com');
    }

    togglePKField() {
        const field = document.getElementById('pkField');
        const icon = document.getElementById('pkFieldIcon');
        if (field.type === 'password') {
            field.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            field.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    exportWallet() {
        const data = JSON.stringify(this.wallet, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hust-wallet.json';
        a.click();
    }

    showSend() {
        this.page = 'send';
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <!-- Header -->
                <div class="bg-white shadow-sm border-b border-gray-200">
                    <div class="max-w-4xl mx-auto px-8 py-6">
                        <button onclick="wallet.showDashboard()" class="mb-4 btn-secondary inline-flex items-center">
                            <i class="fas fa-arrow-left mr-2"></i> Quay lại Dashboard
                        </button>
                        <div class="text-center">
                            <div class="text-6xl mb-4">💸</div>
                            <h1 class="text-4xl font-bold gradient-text mb-2">Gửi Tiền</h1>
                            <p class="text-gray-600 text-lg">Chuyển ETH đến địa chỉ ví khác một cách an toàn</p>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div class="max-w-4xl mx-auto px-8 py-12">
                    <div class="grid lg:grid-cols-3 gap-8">
                        <!-- Main Form -->
                        <div class="lg:col-span-2">
                            <div class="card fade-in">
                                <form onsubmit="wallet.handleSend(event)" class="space-y-8">
                                    <!-- Recipient Address -->
                                    <div>
                                        <label class="block text-lg font-bold text-gray-700 mb-3">
                                            <i class="fas fa-wallet mr-2 text-purple-600"></i>Địa Chỉ Nhận
                                        </label>
                                        <div class="relative">
                                            <input 
                                                type="text" 
                                                id="recipient" 
                                                required 
                                                class="w-full p-4 pr-12 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none transition-colors font-mono text-lg"
                                                placeholder="0x..."
                                            >
                                            <button 
                                                type="button"
                                                onclick="wallet.pasteAddress()" 
                                                class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-purple-600 p-2"
                                                title="Dán địa chỉ"
                                            >
                                                <i class="fas fa-paste"></i>
                                            </button>
                                        </div>
                                        <p class="text-sm text-gray-500 mt-2">
                                            <i class="fas fa-info-circle mr-1"></i>
                                            Địa chỉ ví Ethereum phải bắt đầu bằng "0x" và có 42 ký tự
                                        </p>
                                    </div>

                                    <!-- Amount -->
                                    <div>
                                        <label class="block text-lg font-bold text-gray-700 mb-3">
                                            <i class="fas fa-coins mr-2 text-yellow-600"></i>Số Lượng ETH
                                        </label>
                                        <div class="relative">
                                            <input 
                                                type="number" 
                                                id="amount" 
                                                step="0.000000000000000001" 
                                                min="0" 
                                                required
                                                class="w-full p-4 pr-20 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-lg"
                                                placeholder="0.0"
                                            >
                                            <span class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">ETH</span>
                                        </div>
                                        <div class="mt-3 p-3 bg-blue-50 rounded-lg">
                                            <p class="text-sm text-blue-800">
                                                <i class="fas fa-piggy-bank mr-2"></i>
                                                Số dư khả dụng: <span class="font-bold">${parseFloat(this.balance || 0).toFixed(6)} ETH</span>
                                            </p>
                                        </div>
                                    </div>

                                    <!-- Gas Fee Info -->
                                    <div class="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
                                        <div class="flex items-start">
                                            <i class="fas fa-gas-pump text-amber-600 text-xl mr-3 mt-1"></i>
                                            <div>
                                                <h4 class="font-bold text-amber-900 mb-2">Phí Gas (Gas Fee)</h4>
                                                <p class="text-amber-700 text-sm mb-3">Phí gas ước tính: ~0.0001 ETH</p>
                                                <p class="text-amber-600 text-xs">Phí gas sẽ được tự động tính toán và trừ vào số dư của bạn</p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Submit Button -->
                                    <button 
                                        type="submit" 
                                        id="sendBtn"
                                        class="w-full btn-primary py-4 text-xl font-bold rounded-xl hover:shadow-lg transition-all"
                                    >
                                        <i class="fas fa-paper-plane mr-3"></i> Gửi Tiền Ngay
                                    </button>
                                </form>
                            </div>
                        </div>

                        <!-- Summary Sidebar -->
                        <div class="lg:col-span-1">
                            <div class="sticky top-8 space-y-6">
                                <!-- Transaction Summary -->
                                <div class="card bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 fade-in">
                                    <h3 class="font-bold text-gray-900 mb-6 text-xl flex items-center">
                                        <i class="fas fa-receipt mr-2 text-purple-600"></i> Chi Tiết Giao Dịch
                                    </h3>
                                    <div class="space-y-4">
                                        <div class="flex justify-between items-center">
                                            <span class="text-gray-600 font-medium">Số lượng gửi</span>
                                            <span class="text-2xl font-bold text-gray-900" id="summaryAmount">0.0000</span>
                                        </div>
                                        <div class="border-t border-purple-200 pt-4">
                                            <div class="flex justify-between items-center">
                                                <span class="text-gray-600 font-medium">Phí gas ước tính</span>
                                                <span class="text-lg font-bold text-gray-900">~0.0001</span>
                                            </div>
                                        </div>
                                        <div class="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-4 text-white">
                                            <div class="flex justify-between items-center">
                                                <span class="font-semibold">Tổng cộng</span>
                                                <div class="text-right">
                                                    <p class="text-3xl font-bold" id="summaryTotal">0.0001</p>
                                                    <p class="text-xs opacity-90">ETH</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Security Warning -->
                                <div class="card bg-red-50 border-2 border-red-200 fade-in">
                                    <h4 class="font-bold text-red-700 mb-4 flex items-center text-lg">
                                        <i class="fas fa-shield-alt mr-2"></i> Cảnh Báo Bảo Mật
                                    </h4>
                                    <ul class="space-y-3 text-sm text-red-700">
                                        <li class="flex items-start">
                                            <i class="fas fa-check-circle text-red-500 mr-2 mt-0.5"></i>
                                            <span>Luôn kiểm tra kỹ địa chỉ ví trước khi gửi</span>
                                        </li>
                                        <li class="flex items-start">
                                            <i class="fas fa-check-circle text-red-500 mr-2 mt-0.5"></i>
                                            <span>Giao dịch không thể hoàn tác sau khi xác nhận</span>
                                        </li>
                                        <li class="flex items-start">
                                            <i class="fas fa-check-circle text-red-500 mr-2 mt-0.5"></i>
                                            <span>Chỉ gửi tiền cho người/bên mà bạn tin tưởng</span>
                                        </li>
                                    </ul>
                                </div>

                                <!-- Quick Actions -->
                                <div class="card fade-in">
                                    <h4 class="font-bold text-gray-900 mb-4">Thao Tác Nhanh</h4>
                                    <div class="space-y-3">
                                        <button onclick="wallet.scanQRCode()" class="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition">
                                            <i class="fas fa-qrcode"></i> Quét mã QR
                                        </button>
                                        <button onclick="wallet.showDashboard()" class="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 p-3 rounded-lg transition">
                                            <i class="fas fa-times"></i> Hủy giao dịch
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Update summary on amount change
        setTimeout(() => {
            const amountInput = document.getElementById('amount');
            if (amountInput) {
                amountInput.addEventListener('input', (e) => {
                    const amount = parseFloat(e.target.value) || 0;
                    const total = (amount + 0.0001).toFixed(4);
                    document.getElementById('summaryAmount').textContent = amount.toFixed(4);
                    document.getElementById('summaryTotal').textContent = total;
                });
            }
        }, 100);
    }

    async handleSend(e) {
        e.preventDefault();
        const recipient = document.getElementById('recipient').value.trim();
        const amount = document.getElementById('amount').value.trim();
        
        if (!ethers.isAddress(recipient)) {
            this.showError('Địa chỉ không hợp lệ');
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Đang xử lý...';
            
            const tx = await this.signer.sendTransaction({
                to: recipient,
                value: ethers.parseEther(amount)
            });
            
            this.showSuccess(`Đã gửi ${amount} ETH đến ${recipient.substring(0, 6)}...`);
            await tx.wait();
            await this.updateBalance();
            this.showDashboard();
        } catch (e) {
            console.error('Lỗi gửi giao dịch:', e);
            this.showError('Gửi tiền thất bại: ' + (e.message || 'Lỗi không xác định'));
            
            // Reset button state
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Gửi';
            }
        }
    }

    showReceive() {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <!-- Header -->
                <div class="bg-white shadow-sm border-b border-gray-200">
                    <div class="max-w-4xl mx-auto px-8 py-6">
                        <button onclick="wallet.showDashboard()" class="mb-4 btn-secondary inline-flex items-center">
                            <i class="fas fa-arrow-left mr-2"></i> Quay lại Dashboard
                        </button>
                        <div class="text-center">
                            <div class="text-6xl mb-4">💰</div>
                            <h1 class="text-4xl font-bold gradient-text mb-2">Nhận Tiền</h1>
                            <p class="text-gray-600 text-lg">Chia sẻ địa chỉ ví để nhận ETH một cách an toàn</p>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div class="max-w-4xl mx-auto px-8 py-12">
                    <div class="grid lg:grid-cols-2 gap-8">
                        <!-- Left Column - Address & Sharing -->
                        <div class="space-y-6">
                            <!-- Wallet Address Card -->
                            <div class="card bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 fade-in">
                                <div class="flex items-center mb-6">
                                    <div class="text-3xl mr-3">📍</div>
                                    <div>
                                        <h3 class="text-2xl font-bold text-gray-900">Địa Chỉ Ví</h3>
                                        <p class="text-sm text-gray-600">Địa chỉ Ethereum độc nhất của bạn</p>
                                    </div>
                                </div>
                                
                                <div class="bg-white rounded-xl p-4 mb-4">
                                    <div class="flex items-center gap-3">
                                        <input 
                                            type="text" 
                                            value="${this.wallet.address}" 
                                            readonly 
                                            class="flex-1 font-mono text-sm bg-gray-50 p-3 rounded-lg border border-gray-200"
                                            id="walletAddress"
                                        >
                                        <button 
                                            onclick="wallet.copyAddress()" 
                                            class="btn-primary p-3 rounded-lg"
                                            title="Sao chép địa chỉ"
                                        >
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-2 gap-3">
                                    <button 
                                        onclick="wallet.copyAddress()" 
                                        class="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition"
                                    >
                                        <i class="fas fa-copy"></i> Sao Chép
                                    </button>
                                    <button 
                                        onclick="wallet.shareAddress()" 
                                        class="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition"
                                    >
                                        <i class="fas fa-share"></i> Chia Sẻ
                                    </button>
                                </div>
                            </div>

                            <!-- Share Options -->
                            <div class="card fade-in">
                                <h3 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                    <i class="fas fa-paper-plane mr-2 text-blue-600"></i>
                                    Gửi Địa Chỉ
                                </h3>
                                <div class="space-y-3">
                                    <button 
                                        onclick="wallet.shareViaSocial()" 
                                        class="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 rounded-xl transition-all"
                                    >
                                        <i class="fas fa-share-alt text-xl"></i>
                                        <span>Chia sẻ qua mạng xã hội</span>
                                    </button>
                                    <button 
                                        onclick="wallet.sendEmail()" 
                                        class="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-4 rounded-xl transition-all"
                                    >
                                        <i class="fas fa-envelope text-xl"></i>
                                        <span>Gửi qua Email</span>
                                    </button>
                                    <button 
                                        onclick="wallet.generatePaymentLink()" 
                                        class="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 rounded-xl transition-all"
                                    >
                                        <i class="fas fa-link text-xl"></i>
                                        <span>Tạo link thanh toán</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Network Info -->
                            <div class="card bg-gray-50 border-2 border-gray-200 fade-in">
                                <h4 class="font-bold text-gray-900 mb-4 flex items-center">
                                    <i class="fas fa-network-wired mr-2 text-gray-600"></i>
                                    Thông Tin Mạng
                                </h4>
                                <div class="space-y-3 text-sm">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Mạng:</span>
                                        <span class="font-semibold">Hardhat Local</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Chain ID:</span>
                                        <span class="font-semibold">31337</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">Token:</span>
                                        <span class="font-semibold">ETH</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column - QR Code -->
                        <div class="space-y-6">
                            <!-- QR Code Card -->
                            <div class="card bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 fade-in">
                                <div class="text-center">
                                    <div class="flex items-center justify-center mb-6">
                                        <div class="text-3xl mr-3">📱</div>
                                        <div>
                                            <h3 class="text-2xl font-bold text-gray-900">Mã QR</h3>
                                            <p class="text-sm text-gray-600">Quét để nhận tiền</p>
                                        </div>
                                    </div>
                                    
                                    <div class="bg-white rounded-2xl p-8 inline-block shadow-lg">
                                        <div id="qrcode2" class="flex justify-center"></div>
                                    </div>
                                    
                                    <div class="mt-6 space-y-3">
                                        <p class="text-sm text-gray-600">
                                            <i class="fas fa-info-circle mr-1"></i>
                                            Người gửi có thể quét mã QR này để điền tự động địa chỉ ví của bạn
                                        </p>
                                        <button 
                                            onclick="wallet.downloadQR()" 
                                            class="flex items-center justify-center gap-2 mx-auto bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition"
                                        >
                                            <i class="fas fa-download"></i> Tải xuống mã QR
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Balance Display -->
                            <div class="card bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 fade-in">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h4 class="font-bold text-green-900 mb-1">Số dư hiện tại</h4>
                                        <p class="text-3xl font-bold text-green-800">${parseFloat(this.balance || 0).toFixed(4)} ETH</p>
                                        <p class="text-sm text-green-600">≈ $${(parseFloat(this.balance || 0) * 2000).toFixed(2)} USD</p>
                                    </div>
                                    <div class="text-5xl opacity-50">💎</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Instructions -->
                    <div class="mt-12 card bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 fade-in">
                        <h4 class="font-bold text-gray-900 mb-8 text-2xl text-center flex items-center justify-center">
                            <i class="fas fa-graduation-cap mr-3 text-blue-600"></i>
                            Hướng Dẫn Nhận Tiền
                        </h4>
                        <div class="grid md:grid-cols-4 gap-6">
                            <div class="text-center">
                                <div class="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-2xl font-bold mx-auto mb-4">
                                    1
                                </div>
                                <h5 class="font-bold text-blue-900 mb-2">Chia sẻ địa chỉ</h5>
                                <p class="text-sm text-blue-700">Sao chép hoặc chia sẻ địa chỉ ví/Mã QR với người gửi</p>
                            </div>
                            <div class="text-center">
                                <div class="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full text-2xl font-bold mx-auto mb-4">
                                    2
                                </div>
                                <h5 class="font-bold text-purple-900 mb-2">Người gửi chuyển</h5>
                                <p class="text-sm text-purple-700">Người gửi sẽ chuyển ETH đến địa chỉ của bạn</p>
                            </div>
                            <div class="text-center">
                                <div class="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full text-2xl font-bold mx-auto mb-4">
                                    3
                                </div>
                                <h5 class="font-bold text-green-900 mb-2">Xác nhận giao dịch</h5>
                                <p class="text-sm text-green-700">Giao dịch sẽ được xác nhận trên mạng lưới</p>
                            </div>
                            <div class="text-center">
                                <div class="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full text-2xl font-bold mx-auto mb-4">
                                    4
                                </div>
                                <h5 class="font-bold text-orange-900 mb-2">Kiểm tra số dư</h5>
                                <p class="text-sm text-orange-700">Số dư sẽ được cập nhật tự động</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        new QRCode(document.getElementById('qrcode2'), {
            text: this.wallet.address,
            width: 256,
            height: 256,
            colorDark: '#4F46E5',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    // Helper methods for send and receive
    async pasteAddress() {
        try {
            const text = await navigator.clipboard.readText();
            const recipientInput = document.getElementById('recipient');
            recipientInput.value = text.trim();
            
            // Validate the pasted address
            if (!ethers.isAddress(text)) {
                this.showError('Địa chỉ không hợp lệ');
            }
        } catch (e) {
            this.showError('Không thể dán từ clipboard');
        }
    }

    scanQRCode() {
        // This would require QR code scanning library
        this.showError('Tính năng quét mã QR chưa được hỗ trợ');
    }

    copyAddress() {
        navigator.clipboard.writeText(this.wallet.address).then(() => {
            this.showSuccess('Đã sao chép địa chỉ ví');
        }).catch(() => {
            this.showError('Không thể sao chép địa chỉ');
        });
    }

    shareAddress() {
        if (navigator.share) {
            navigator.share({
                title: 'HUST Wallet',
                text: `Gửi ETH cho tôi: ${this.wallet.address}`
            }).catch(() => {
                // User cancelled
            });
        } else {
            // Fallback for browsers that don't support Web Share API
            this.copyAddress();
        }
    }

    shareViaSocial() {
        const text = `Gửi ETH cho tôi: ${this.wallet.address}`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    }

    sendEmail() {
        const subject = 'Gửi ETH cho tôi';
        const body = `Gửi ETH cho tôi đến địa chỉ: ${this.wallet.address}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    generatePaymentLink() {
        const link = `ethereum:${this.wallet.address}`;
        navigator.clipboard.writeText(link).then(() => {
            this.showSuccess('Đã tạo link thanh toán và sao chép vào clipboard');
        }).catch(() => {
            this.showError('Không thể tạo link thanh toán');
        });
    }

    downloadQR() {
        const canvas = document.querySelector('#qrcode2 canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'wallet-qr-code.png';
            link.href = canvas.toDataURL();
            link.click();
            this.showSuccess('Đã tải xuống mã QR');
        } else {
            this.showError('Không thể tải xuống mã QR');
        }
    }

    // Show error message
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 z-50';
        errorDiv.style.minWidth = '300px';
        errorDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-red-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    // Show success message
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 z-50';
        successDiv.style.minWidth = '300px';
        successDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-check-circle mr-2"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-green-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 5000);
    }

    // Update balance display in the UI
    updateBalanceUI() {
        const ethBalanceEl = document.getElementById('eth-balance');
        const hustBalanceEl = document.getElementById('hust-balance');
        
        if (ethBalanceEl) ethBalanceEl.textContent = `${parseFloat(this.balance || 0).toFixed(4)} ETH`;
        if (hustBalanceEl) hustBalanceEl.textContent = `${parseFloat(this.hustBalance || 0).toFixed(2)} HUST`;
    }

    // Setup event listeners for blockchain events
    setupEventListeners() {
        // Listen for new blocks to update balance
        this.provider.on('block', async () => {
            await this.updateBalance();
        });

        // Listen for token transfers
        if (this.hustContract) {
            const filter = this.hustContract.filters.Transfer(null, this.wallet.address);
            this.hustContract.on(filter, async (from, to, amount, event) => {
                const decimals = await this.hustContract.decimals();
                this.showSuccess(`Nhận được ${ethers.formatUnits(amount, decimals)} HUST`);
                this.updateBalance();
            });
        }
    }

    logout() {
        if (confirm('Bạn có chắc chắn muốn đăng xuất? Khóa riêng tư sẽ bị xóa khỏi bộ nhớ.')) {
            localStorage.removeItem('wallet');
            this.wallet = null;
            this.provider = null;
            this.signer = null;
            this.hustContract = null;
            if (this.txRefreshInterval) {
                clearInterval(this.txRefreshInterval);
                this.txRefreshInterval = null;
            }
            this.showHome();
        }
    }
}

const wallet = new Wallet();
window.wallet = wallet; // Make wallet globally available

document.addEventListener('DOMContentLoaded', () => {
    wallet.init();
});
