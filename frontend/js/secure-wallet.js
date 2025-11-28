// Secure Wallet with Web Crypto API
// End-to-end encryption implementation

class SecureWallet extends Wallet {
    constructor() {
        super();
        this.encryptionKey = null;
        this.keyPair = null;
        this.sharedSecrets = new Map(); // Store shared secrets for different recipients
        this.encryptedBackup = null;
        this.securityLevel = 'high'; // low, medium, high
    }

    // ==================== PASSWORD-BASED ENCRYPTION ====================
    
    /**
     * Derive encryption key from password using PBKDF2
     */
    async deriveKeyFromPassword(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.securityLevel === 'high' ? 200000 : 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt private key with password
     */
    async encryptPrivateKey(privateKey, password) {
        try {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            const key = await this.deriveKeyFromPassword(password, salt);
            
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                new TextEncoder().encode(privateKey)
            );

            return {
                algorithm: 'AES-256-GCM',
                keyDerivation: 'PBKDF2',
                iterations: this.securityLevel === 'high' ? 200000 : 100000,
                salt: Array.from(salt),
                iv: Array.from(iv),
                encrypted: Array.from(new Uint8Array(encrypted)),
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error encrypting private key:', error);
            throw new Error('Failed to encrypt private key');
        }
    }

    /**
     * Decrypt private key with password
     */
    async decryptPrivateKey(encryptedData, password) {
        try {
            const salt = new Uint8Array(encryptedData.salt);
            const iv = new Uint8Array(encryptedData.iv);
            const encrypted = new Uint8Array(encryptedData.encrypted);
            
            const key = await this.deriveKeyFromPassword(password, salt);
            
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );

            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('Error decrypting private key:', error);
            throw new Error('Invalid password or corrupted data');
        }
    }

    // ==================== SECURE WALLET CREATION ====================

    /**
     * Create secure wallet with password protection
     */
    async createSecureWallet(password, confirmPassword) {
        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        try {
            // Generate random wallet
            const w = ethers.Wallet.createRandom();
            
            // Encrypt private key
            const encryptedPrivateKey = await this.encryptPrivateKey(w.privateKey, password);
            
            // Create secure wallet object
            const secureWallet = {
                address: w.address,
                encryptedPrivateKey: encryptedPrivateKey,
                publicKey: await this.generatePublicKey(),
                createdAt: Date.now(),
                securityLevel: this.securityLevel
            };

            // Store encrypted wallet
            localStorage.setItem('secureWallet', JSON.stringify(secureWallet));
            
            // Generate recovery phrase
            const recoveryPhrase = await this.generateRecoveryPhrase(password);
            
            return {
                wallet: secureWallet,
                recoveryPhrase: recoveryPhrase,
                address: w.address
            };
        } catch (error) {
            throw new Error('Failed to create secure wallet: ' + error.message);
        }
    }

    /**
     * Import secure wallet with password
     */
    async importSecureWallet(encryptedData, password) {
        try {
            const secureWallet = typeof encryptedData === 'string' 
                ? JSON.parse(encryptedData) 
                : encryptedData;

            // Decrypt private key
            const privateKey = await this.decryptPrivateKey(secureWallet.encryptedPrivateKey, password);
            
            // Create ethers wallet
            const ethersWallet = new ethers.Wallet(privateKey);
            
            // Verify address matches
            if (ethersWallet.address.toLowerCase() !== secureWallet.address.toLowerCase()) {
                throw new Error('Address mismatch - corrupted wallet data');
            }

            // Store and connect
            this.wallet = { 
                address: secureWallet.address, 
                privateKey: privateKey,
                encryptedPrivateKey: secureWallet.encryptedPrivateKey
            };
            
            localStorage.setItem('secureWallet', JSON.stringify(secureWallet));
            await this.connectWallet();
            
            return true;
        } catch (error) {
            throw new Error('Failed to import wallet: ' + error.message);
        }
    }

    // ==================== ECDH KEY EXCHANGE ====================

    /**
     * Generate ECDH key pair for secure communication
     */
    async generateKeyPair() {
        try {
            this.keyPair = await crypto.subtle.generateKey(
                { name: 'ECDH', namedCurve: 'P-256' },
                true,
                ['deriveKey']
            );
            
            // Export public key
            const publicKey = await crypto.subtle.exportKey('raw', this.keyPair.publicKey);
            
            return {
                publicKey: Array.from(new Uint8Array(publicKey)),
                keyPair: this.keyPair
            };
        } catch (error) {
            console.error('Error generating key pair:', error);
            throw new Error('Failed to generate key pair');
        }
    }

    /**
     * Derive shared secret with recipient's public key
     */
    async deriveSharedSecret(recipientPublicKey) {
        if (!this.keyPair) {
            await this.generateKeyPair();
        }

        try {
            // Import recipient's public key
            const publicKey = await crypto.subtle.importKey(
                'raw',
                new Uint8Array(recipientPublicKey),
                { name: 'ECDH', namedCurve: 'P-256' },
                false,
                []
            );

            // Derive shared secret
            const sharedSecret = await crypto.subtle.deriveKey(
                { name: 'ECDH', public: publicKey },
                this.keyPair.privateKey,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            // Store shared secret for this recipient
            const recipientId = Array.from(recipientPublicKey).join('-');
            this.sharedSecrets.set(recipientId, sharedSecret);

            return sharedSecret;
        } catch (error) {
            console.error('Error deriving shared secret:', error);
            throw new Error('Failed to derive shared secret');
        }
    }

    // ==================== SECURE MESSAGING ====================

    /**
     * Encrypt message with shared secret
     */
    async encryptMessage(message, recipientPublicKey) {
        try {
            const sharedSecret = await this.deriveSharedSecret(recipientPublicKey);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                sharedSecret,
                new TextEncoder().encode(message)
            );

            return {
                encrypted: Array.from(new Uint8Array(encrypted)),
                iv: Array.from(iv),
                senderPublicKey: (await this.generateKeyPair()).publicKey,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error encrypting message:', error);
            throw new Error('Failed to encrypt message');
        }
    }

    /**
     * Decrypt message with shared secret
     */
    async decryptMessage(encryptedMessage, senderPublicKey) {
        try {
            const sharedSecret = await this.deriveSharedSecret(senderPublicKey);
            const iv = new Uint8Array(encryptedMessage.iv);
            const encrypted = new Uint8Array(encryptedMessage.encrypted);
            
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                sharedSecret,
                encrypted
            );

            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('Error decrypting message:', error);
            throw new Error('Failed to decrypt message');
        }
    }

    // ==================== DIGITAL SIGNATURES ====================

    /**
     * Sign transaction data
     */
    async signTransaction(transactionData) {
        try {
            // Create signing key from private key
            const signingKey = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(this.wallet.privateKey),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['sign']
            );

            const message = new TextEncoder().encode(JSON.stringify(transactionData));
            const signature = await crypto.subtle.sign('HMAC', signingKey, message);

            return Array.from(new Uint8Array(signature));
        } catch (error) {
            console.error('Error signing transaction:', error);
            throw new Error('Failed to sign transaction');
        }
    }

    /**
     * Verify transaction signature
     */
    async verifySignature(transactionData, signature, publicKey) {
        try {
            const signingKey = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(publicKey),
                { name: 'HMAC', hash: 'SHA-256' },
                false,
                ['verify']
            );

            const message = new TextEncoder().encode(JSON.stringify(transactionData));
            const signatureArray = new Uint8Array(signature);

            return crypto.subtle.verify('HMAC', signingKey, signatureArray, message);
        } catch (error) {
            console.error('Error verifying signature:', error);
            return false;
        }
    }

    // ==================== SECURE BACKUP ====================

    /**
     * Create encrypted backup
     */
    async createSecureBackup(password, includePrivateKey = true) {
        try {
            const backupData = {
                address: this.wallet.address,
                publicKey: await this.generatePublicKey(),
                createdAt: Date.now(),
                version: '1.0'
            };

            if (includePrivateKey) {
                backupData.encryptedPrivateKey = await this.encryptPrivateKey(this.wallet.privateKey, password);
            }

            // Add metadata
            backupData.metadata = {
                app: 'HUST Secure Wallet',
                encryption: 'AES-256-GCM',
                keyDerivation: 'PBKDF2',
                securityLevel: this.securityLevel,
                backupDate: new Date().toISOString()
            };

            // Encrypt entire backup
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const key = await this.deriveKeyFromPassword(password, salt);
            
            const encryptedBackup = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                new TextEncoder().encode(JSON.stringify(backupData))
            );

            this.encryptedBackup = {
                encrypted: Array.from(new Uint8Array(encryptedBackup)),
                iv: Array.from(iv),
                salt: Array.from(salt),
                metadata: backupData.metadata
            };

            return this.encryptedBackup;
        } catch (error) {
            console.error('Error creating backup:', error);
            throw new Error('Failed to create secure backup');
        }
    }

    /**
     * Restore from encrypted backup
     */
    async restoreFromBackup(encryptedBackup, password) {
        try {
            const salt = new Uint8Array(encryptedBackup.salt);
            const iv = new Uint8Array(encryptedBackup.iv);
            const encrypted = new Uint8Array(encryptedBackup.encrypted);
            
            const key = await this.deriveKeyFromPassword(password, salt);
            
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );

            const backupData = JSON.parse(new TextDecoder().decode(decrypted));

            // Restore wallet if private key is included
            if (backupData.encryptedPrivateKey) {
                await this.importSecureWallet(backupData, password);
            }

            return backupData;
        } catch (error) {
            console.error('Error restoring backup:', error);
            throw new Error('Failed to restore from backup - invalid password or corrupted backup');
        }
    }

    // ==================== RECOVERY PHRASE ====================

    /**
     * Generate recovery phrase
     */
    async generateRecoveryPhrase(password) {
        try {
            const entropy = crypto.getRandomValues(new Uint8Array(16));
            const key = await this.deriveKeyFromPassword(password, entropy);
            
            // Generate mnemonic-like phrase
            const words = [
                'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
                'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
                'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual'
            ];

            const phrase = [];
            for (let i = 0; i < 12; i++) {
                const index = entropy[i] % words.length;
                phrase.push(words[index]);
            }

            return {
                phrase: phrase.join(' '),
                checksum: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', entropy))),
                instructions: 'Write this down and store it safely. Never share it with anyone!'
            };
        } catch (error) {
            console.error('Error generating recovery phrase:', error);
            throw new Error('Failed to generate recovery phrase');
        }
    }

    // ==================== PUBLIC KEY OPERATIONS ====================

    /**
     * Generate public key for sharing
     */
    async generatePublicKey() {
        if (!this.keyPair) {
            await this.generateKeyPair();
        }

        const publicKey = await crypto.subtle.exportKey('raw', this.keyPair.publicKey);
        return Array.from(new Uint8Array(publicKey));
    }

    // ==================== SECURITY VALIDATION ====================

    /**
     * Validate password strength
     */
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
                'Use at least 8 characters',
                'Include uppercase and lowercase letters',
                'Add numbers and special characters'
            ] : []
        };
    }

    // ==================== SECURE EXPORT ====================

    /**
     * Export encrypted wallet
     */
    async exportSecureWallet() {
        if (!this.wallet) {
            throw new Error('No wallet to export');
        }

        const secureWallet = JSON.parse(localStorage.getItem('secureWallet'));
        
        if (!secureWallet) {
            throw new Error('No secure wallet data found');
        }

        const blob = new Blob([JSON.stringify(secureWallet, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `secure-wallet-${this.wallet.address.substring(0, 8)}-${Date.now()}.json`;
        a.click();
        
        this.showSuccess('Secure wallet exported successfully');
    }

    // ==================== OVERRIDDEN METHODS ====================

    /**
     * Override confirm to use secure storage
     */
    async confirm(addr, pk, password = null) {
        if (password) {
            // Create secure wallet with password
            const result = await this.createSecureWallet(password, password);
            this.wallet = { address: result.address, privateKey: pk };
            await this.connectWallet();
            this.showSecureDashboard(result);
        } else {
            // Fallback to original method
            super.confirm(addr, pk);
        }
    }

    /**
     * Show secure dashboard
     */
    showSecureDashboard(creationResult = null) {
        if (creationResult) {
            // Show wallet creation success with recovery phrase
            this.showWalletCreationSuccess(creationResult);
        } else {
            // Load existing secure wallet
            super.showDashboard();
        }
    }

    /**
     * Show wallet creation success
     */
    showWalletCreationSuccess(result) {
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

                        <div class="grid grid-cols-2 gap-4">
                            <button onclick="wallet.showDashboard()" class="btn-primary py-3">
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
}

// Replace the global wallet with secure wallet
const secureWallet = new SecureWallet();
window.wallet = secureWallet;

document.addEventListener('DOMContentLoaded', () => {
    secureWallet.init();
});
