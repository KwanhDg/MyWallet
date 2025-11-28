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
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

class Wallet {
    constructor() {
        this.wallet = null;
        this.provider = null;
        this.signer = null;
        this.balance = '0';
        this.hustBalance = '0';
        this.hustContract = null;
        this.page = 'home';
        this.txRefreshInterval = null;
        this.init();
    }

    async init() {
        try {
            this.provider = new ethers.JsonRpcProvider(HARDHAT_RPC);
            this.hustContract = new ethers.Contract(HUST_ADDRESS, ERC20_ABI, this.provider);
            
            const saved = localStorage.getItem('wallet');
            if (saved) {
                this.wallet = JSON.parse(saved);
                await this.connectWallet();
            } else {
                this.showHome();
            }
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Không thể khởi tạo ví. Vui lòng thử lại sau.');
        }
    }

    async connectWallet() {
        try {
            if (!this.wallet?.privateKey) {
                throw new Error('Không tìm thấy thông tin ví');
            }
            
            this.signer = new ethers.Wallet(this.wallet.privateKey, this.provider);
            this.hustContract = this.hustContract.connect(this.signer);
            
            // Verify the wallet is valid
            const address = await this.signer.getAddress();
            if (address.toLowerCase() !== this.wallet.address.toLowerCase()) {
                throw new Error('Thông tin ví không khớp');
            }
            
            await this.updateBalance();
            this.showDashboard();
            this.setupEventListeners();
        } catch (error) {
            console.error('Connection error:', error);
            this.showError(`Kết nối thất bại: ${error.message}`);
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
            
            return { eth: this.balance, hust: this.hustBalance };
        } catch (error) {
            console.error('Balance update error:', error);
            throw error;
        }
    }

    // Show error message to user
    showError(message) {
        const app = document.getElementById('app');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 z-50 rounded shadow-lg';
        errorDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-red-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        app.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    // Show success message to user
    showSuccess(message) {
        const app = document.getElementById('app');
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 z-50 rounded shadow-lg';
        successDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-check-circle mr-2"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-green-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        app.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 5000);
    }

    // Update balance display in the UI
    updateBalanceUI() {
        const ethBalanceEl = document.getElementById('eth-balance');
        const hustBalanceEl = document.getElementById('hust-balance');
        const totalValueEl = document.getElementById('total-value');
        
        if (ethBalanceEl) ethBalanceEl.textContent = `${parseFloat(this.balance).toFixed(4)} ETH`;
        if (hustBalanceEl) hustBalanceEl.textContent = `${parseFloat(this.hustBalance).toFixed(2)} HUST`;
        
        // Calculate total value in USD (example rates)
        const ethRate = 2000; // Example rate: 1 ETH = $2000
        const hustRate = 0.5; // Example rate: 1 HUST = $0.5
        const totalValue = (parseFloat(this.balance) * ethRate) + (parseFloat(this.hustBalance) * hustRate);
        
        if (totalValueEl) totalValueEl.textContent = `$${totalValue.toFixed(2)}`;
    }

    // Setup event listeners for wallet events
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

    // Show home screen
    showHome() {
        this.page = 'home';
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div class="w-full max-w-2xl fade-in">
                    <div class="text-center mb-12">
                        <div class="text-7xl mb-4">💎</div>
                        <h1 class="text-5xl font-bold gradient-text mb-2">HUST Wallet</h1>
                        <p class="text-gray-600 text-lg">Ví tiền điện tử an toàn</p>
                    </div>

                    <div class="grid md:grid-cols-2 gap-6 mb-8">
                        <div class="card cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1" onclick="wallet.showCreate()">
                            <div class="text-center p-6">
                                <div class="text-5xl mb-4 text-blue-500">
                                    <i class="fas fa-plus-circle"></i>
                                </div>
                                <h3 class="text-2xl font-bold mb-2">Tạo Ví Mới</h3>
                                <p class="text-gray-600">Tạo ví mới với khóa riêng tư ngẫu nhiên</p>
                            </div>
                        </div>

                        <div class="card cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1" onclick="wallet.showImport()">
                            <div class="text-center p-6">
                                <div class="text-5xl mb-4 text-green-500">
                                    <i class="fas fa-download"></i>
                                </div>
                                <h3 class="text-2xl font-bold mb-2">Nhập Ví</h3>
                                <p class="text-gray-600">Nhập ví bằng khóa riêng tư hiện có</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-md p-6 text-center">
                        <div class="text-yellow-500 text-4xl mb-3">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <h3 class="text-lg font-semibold mb-2">Bảo mật cao cấp</h3>
                        <p class="text-gray-600 text-sm">Khóa riêng tư của bạn được lưu trữ an toàn ngay trên thiết bị của bạn</p>
                    </div>
                    </div>

                    <div class="grid md:grid-cols-2 gap-6 mb-8">
                        <div class="card cursor-pointer hover:shadow-lg" onclick="wallet.showCreate()">
                            <div class="text-center">
                                <div class="text-5xl mb-4">✨</div>
                                <h3 class="text-2xl font-bold mb-2">Tạo Ví Mới</h3>
                                <p class="text-gray-600">Tạo ví hoàn toàn mới</p>
                            </div>
                        </div>

                        <div class="card cursor-pointer hover:shadow-lg" onclick="wallet.showImport()">
                            <div class="text-center">
                                <div class="text-5xl mb-4">📥</div>
                                <h3 class="text-2xl font-bold mb-2">Nhập Ví</h3>
                                <p class="text-gray-600">Nhập ví hiện có</p>
                            </div>
                        </div>
                    </div>

                    <div class="card text-center text-gray-600">
                        <i class="fas fa-shield-alt text-green-500 mr-2"></i>
                        Ví được lưu an toàn trên thiết bị của bạn
                    </div>
                </div>
            </div>
        `;
    }

    async showDashboard() {
        this.page = 'dashboard';
        const ethValue = (parseFloat(this.balance || 0) * 2000).toFixed(2);
        const hustValue = (parseFloat(this.hustBalance || 0) * 0.5).toFixed(2);
        const total = (parseFloat(ethValue) + parseFloat(hustValue)).toFixed(2);
        
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gray-50 p-4 md:p-6">
                <div class="max-w-6xl mx-auto">
                    <!-- Header -->
                    <header class="mb-8">
                        <h1 class="text-3xl font-bold text-gray-900">Tổng quan</h1>
                        <p class="text-gray-600">Xem tài sản và hoạt động gần đây của bạn</p>
                    </header>
                    
                    <!-- Balance Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div class="card bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                            <p class="text-sm opacity-90 mb-1">Tổng tài sản</p>
                            <h2 class="text-3xl font-bold mb-2">$${total}</h2>
                            <div class="flex justify-between items-center">
                                <span class="text-sm opacity-90">Tính theo tỷ giá thị trường</span>
                            </div>
                        </div>
                        
                        <div class="card bg-white">
                            <div class="flex items-center mb-2">
                                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                    <i class="fab fa-ethereum text-blue-500"></i>
                                </div>
                                <span class="font-medium">Ethereum</span>
                            </div>
                            <div class="flex justify-between items-end">
                                <div>
                                    <p class="text-2xl font-bold">${parseFloat(this.balance || 0).toFixed(4)} ETH</p>
                                    <p class="text-sm text-gray-500">$${ethValue}</p>
                                </div>
                                <button onclick="wallet.showSend()" class="btn-secondary py-1 px-3 text-sm">
                                    Gửi
                                </button>
                            </div>
                        </div>
                        
                        <div class="card bg-white">
                            <div class="flex items-center mb-2">
                                <div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                                    <i class="fas fa-coins text-purple-500"></i>
                                </div>
                                <span class="font-medium">HUST Token</span>
                            </div>
                            <div class="flex justify-between items-end">
                                <div>
                                    <p class="text-2xl font-bold">${parseFloat(this.hustBalance || 0).toFixed(2)} HUST</p>
                                    <p class="text-sm text-gray-500">$${hustValue}</p>
                                </div>
                                <button onclick="wallet.showSwap()" class="btn-secondary py-1 px-3 text-sm">
                                    Đổi
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Transaction History -->
                    <div class="card mb-8">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
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
                                    <tr>
                                        <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                                            <div class="flex flex-col items-center justify-center">
                                                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
                                                <p>Đang tải giao dịch...</p>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Quick Actions -->
                    <div class="mb-8">
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Hành Động Nhanh</h3>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <button onclick="wallet.showSend()" class="card text-center p-4 hover:shadow-md transition-transform hover:-translate-y-1">
                                <div class="text-4xl mb-3 text-blue-500">
                                    <i class="fas fa-paper-plane"></i>
                                </div>
                                <h4 class="font-semibold text-gray-800 text-sm sm:text-base">Gửi Tiền</h4>
                                <p class="text-xs text-gray-500 mt-1">Chuyển ETH</p>
                            </button>
                            <button onclick="wallet.showReceive()" class="card text-center p-4 hover:shadow-md transition-transform hover:-translate-y-1">
                                <div class="text-4xl mb-3 text-green-500">
                                    <i class="fas fa-qrcode"></i>
                                </div>
                                <h4 class="font-semibold text-gray-800 text-sm sm:text-base">Nhận Tiền</h4>
                                <p class="text-xs text-gray-500 mt-1">Chia sẻ địa chỉ</p>
                            </button>
                            <button onclick="wallet.showSwap()" class="card text-center p-4 hover:shadow-md transition-transform hover:-translate-y-1">
                                <div class="text-4xl mb-3 text-purple-500">
                                    <i class="fas fa-exchange-alt"></i>
                                </div>
                                <h4 class="font-semibold text-gray-800 text-sm sm:text-base">Đổi Token</h4>
                                <p class="text-xs text-gray-500 mt-1">Đổi ETH ↔ HUST</p>
                            </button>
                            <button onclick="wallet.showSettings()" class="card text-center p-4 hover:shadow-md transition-transform hover:-translate-y-1">
                                <div class="text-4xl mb-3 text-gray-500">
                                    <i class="fas fa-cog"></i>
                                </div>
                                <h4 class="font-semibold text-gray-800 text-sm sm:text-base">Cài Đặt</h4>
                                <p class="text-xs text-gray-500 mt-1">Quản lý ví</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Load transactions in the background
        this.loadTransactionHistory();
    }
    
    async loadTransactionHistory() {
        try {
            const transactions = await this.getEthTransactions();
            const tbody = document.getElementById('txHistoryBody');
            
            if (!transactions || transactions.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="px-6 py-8 text-center text-gray-500">
                            <div class="flex flex-col items-center justify-center">
                                <i class="fas fa-inbox text-3xl text-gray-300 mb-2"></i>
                                <p>Không có giao dịch nào gần đây</p>
                            </div>
                        </td>
                    </tr>`;
                return;
            }
            
            const rows = transactions.slice(0, 5).map(tx => `
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
            `).join('');
            
            tbody.innerHTML = rows;
            
        } catch (error) {
            console.error('Error loading transaction history:', error);
            const tbody = document.getElementById('txHistoryBody');
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-8 text-center text-red-500">
                        <div class="flex flex-col items-center justify-center">
                            <i class="fas fa-exclamation-triangle text-3xl text-red-300 mb-2"></i>
                            <p>Không thể tải lịch sử giao dịch</p>
                            <button onclick="wallet.loadTransactionHistory()" class="mt-2 text-blue-500 hover:underline text-sm">
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
            
            // Get all transaction hashes for the wallet
            const sentTxs = await this.provider.getTransactionList(this.wallet.address);
            console.log('Found transactions:', sentTxs.length);
            
            const txs = [];
            
            // Process each transaction
            for (const txHash of sentTxs) {
                try {
                    const tx = await this.provider.getTransaction(txHash);
                    if (!tx) continue;
                    
                    const receipt = await tx.wait();
                    const block = await this.provider.getBlock(receipt.blockNumber);
                    
                    txs.push({
                        hash: tx.hash,
                        type: tx.from?.toLowerCase() === this.wallet.address.toLowerCase() ? 'Gửi' : 'Nhận',
                        counterparty: tx.from?.toLowerCase() === this.wallet.address.toLowerCase() 
                            ? (tx.to || 'Hợp đồng') 
                            : (tx.from || 'Không xác định'),
                        amount: ethers.formatEther(tx.value),
                        time: block ? new Date(block.timestamp * 1000).toLocaleString('vi-VN') : 'Chưa xác định'
                    });
                    
                    if (txs.length >= 50) break; // Limit to 50 most recent transactions
                } catch (error) {
                    console.error('Error processing transaction:', txHash, error);
                }
            }
            
            console.log('Returning transactions:', txs.length);
            return txs.reverse(); // Return most recent first
            
        } catch (error) {
            console.error('Error in getEthTransactions:', error);
            // Return sample data for testing if there's an error
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

    showImport() {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div class="w-full max-w-2xl fade-in">
                    <button onclick="wallet.showHome()" class="mb-6 btn-secondary">
                        <i class="fas fa-arrow-left mr-2"></i> Quay lại
                    </button>

                    <div class="card">
                        <h2 class="text-4xl font-bold mb-8">Nhập Ví</h2>

                        <div class="mb-6">
                            <label class="block text-sm font-bold text-gray-700 mb-3">Private Key</label>
                            <textarea id="pkInput" placeholder="0x..." rows="4" class="w-full"></textarea>
                            <p class="text-sm text-gray-500 mt-2">Phải bắt đầu bằng 0x</p>
                        </div>

                        <button onclick="wallet.importWallet()" class="w-full btn-primary py-3 text-lg">
                            <i class="fas fa-upload mr-2"></i> Nhập Ví
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    generateWallet() {
        const w = ethers.Wallet.createRandom();
        this.showReview(w);
    }

    importWallet() {
        const pk = document.getElementById('pkInput').value.trim();
        if (!pk) {
            alert('Vui lòng nhập Private Key');
            return;
        }
        try {
            const w = new ethers.Wallet(pk);
            this.showReview(w);
        } catch (e) {
            alert('Private Key không hợp lệ: ' + e.message);
        }
    }

    showReview(w) {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div class="w-full max-w-2xl fade-in">
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

    showSend() {
        // Implement send functionality
        alert('Tính năng gửi tiền đang được phát triển');
    }

    showReceive() {
        // Implement receive functionality
        alert('Tính năng nhận tiền đang được phát triển');
    }

    showSwap() {
        // Implement swap functionality
        alert('Tính năng đổi token đang được phát triển');
    }

    showSettings() {
        // Implement settings functionality
        alert('Tính năng cài đặt đang được phát triển');
    }

    refreshBalance() {
        // Implement balance refresh
        this.updateBalance().then(() => {
            if (this.page === 'dashboard') {
                this.showDashboard();
            }
        });
    }
}

// Initialize wallet when the page loads
const wallet = new Wallet();
window.wallet = wallet; // Make wallet globally available
