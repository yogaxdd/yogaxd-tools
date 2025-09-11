// YogaXD Tools JavaScript - Neumorphism Design
class YogaXDTools {
    constructor() {
        this.initializeEventListeners();
        this.currentProcessedImage = null;
    }

    initializeEventListeners() {
        // File upload for ToHitam
        const tohitamUpload = document.getElementById('tohitam-upload');
        const tohitamFile = document.getElementById('tohitam-file');
        
        tohitamUpload.addEventListener('click', () => tohitamFile.click());
        tohitamUpload.addEventListener('dragover', this.handleDragOver);
        tohitamUpload.addEventListener('drop', (e) => this.handleFileDrop(e, 'tohitam'));
        tohitamFile.addEventListener('change', (e) => this.handleFileSelect(e, 'tohitam'));

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleFileDrop(e, tool) {
        e.preventDefault();
        e.stopPropagation();
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && tool === 'tohitam') {
            this.processImageFile(files[0]);
        }
    }

    handleFileSelect(e, tool) {
        const file = e.target.files[0];
        if (file && tool === 'tohitam') {
            this.processImageFile(file);
        }
    }

    processImageFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select a valid image file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('tohitam-preview');
            const resultArea = document.getElementById('tohitam-result');
            const uploadArea = document.getElementById('tohitam-upload');
            
            preview.src = e.target.result;
            resultArea.style.display = 'block';
            uploadArea.style.display = 'none';
            
            // Store original image data
            this.originalImageData = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async processToHitam() {
        if (!this.originalImageData) {
            this.showNotification('Silakan pilih gambar terlebih dahulu', 'error');
            return;
        }

        this.showLoading(true);
        
        try {
            // Upload image to external service first, then use API
            const imageUrl = await this.uploadImageToService(this.originalImageData);
            
            if (!imageUrl) {
                throw new Error('Gagal mengupload gambar ke layanan eksternal');
            }
            
            // Use Vercel proxy to avoid CORS issues
            const apiUrl = `/api/tohitam?link=${encodeURIComponent(imageUrl)}`;
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const imageBlob = await response.blob();
                const processedImageUrl = URL.createObjectURL(imageBlob);
                
                // Update preview with processed image
                const preview = document.getElementById('tohitam-preview');
                preview.src = processedImageUrl;
                
                // Store processed image for download
                this.currentProcessedImage = processedImageUrl;
                
                // Show download button
                const downloadBtn = document.querySelector('#tohitam-result .download-btn');
                downloadBtn.style.display = 'flex';
                
                this.showNotification('Karakter berhasil diubah jadi hitam!', 'success');
            } else {
                throw new Error(`API Error: ${response.status}`);
            }
            
        } catch (error) {
            this.showNotification('Error memproses gambar: ' + error.message, 'error');
        }
        
        this.showLoading(false);
    }

    async processImageLocallyToHitam(imageDataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    // Create canvas
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set canvas size to match image
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Draw image to canvas
                    ctx.drawImage(img, 0, 0);
                    
                    // Get image data
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    
                    // Enhanced skin tone detection and replacement
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        
                        // Multiple skin tone detection algorithms
                        const isSkinTone = this.detectSkinTone(r, g, b);
                        
                        if (isSkinTone) {
                            // Replace with darker skin tone (more realistic brown/black)
                            data[i] = Math.min(255, Math.max(20, r * 0.2 + 60));     // Red with brown tint
                            data[i + 1] = Math.min(255, Math.max(15, g * 0.2 + 35)); // Green
                            data[i + 2] = Math.min(255, Math.max(10, b * 0.2 + 20)); // Blue
                        }
                    }
                    
                    // Put the modified image data back to canvas
                    ctx.putImageData(imageData, 0, 0);
                    
                    // Convert canvas to data URL
                    const processedDataUrl = canvas.toDataURL('image/png', 0.9);
                    resolve(processedDataUrl);
                    
                } catch (error) {
                    reject(new Error('Gagal memproses gambar: ' + error.message));
                }
            };
            
            img.onerror = () => {
                reject(new Error('Gagal memuat gambar'));
            };
            
            img.src = imageDataUrl;
        });
    }

    detectSkinTone(r, g, b) {
        // Multiple skin tone detection methods for better accuracy
        
        // Method 1: Basic skin tone detection
        const method1 = (
            r > 95 && g > 40 && b > 20 &&
            r > g && r > b &&
            Math.abs(r - g) > 15 &&
            r - b > 15
        );
        
        // Method 2: Light skin tone detection
        const method2 = (
            r > 220 && g > 210 && b > 170 &&
            Math.abs(r - g) <= 15 &&
            r > b && g > b
        );
        
        // Method 3: Medium skin tone detection
        const method3 = (
            r > 150 && g > 100 && b > 80 &&
            r > g && g > b &&
            (r - g) < 50 && (g - b) < 30
        );
        
        // Method 4: HSV-based skin detection
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        let h = 0;
        if (delta !== 0) {
            if (max === r) {
                h = ((g - b) / delta) % 6;
            } else if (max === g) {
                h = (b - r) / delta + 2;
            } else {
                h = (r - g) / delta + 4;
            }
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        
        const s = max === 0 ? 0 : delta / max;
        const v = max / 255;
        
        const method4 = (
            h >= 0 && h <= 50 &&
            s >= 0.23 && s <= 0.68 &&
            v >= 0.35 && v <= 0.95
        );
        
        return method1 || method2 || method3 || method4;
    }

    async uploadImageToService(imageDataUrl) {
        try {
            // Convert data URL to blob
            const response = await fetch(imageDataUrl);
            const blob = await response.blob();
            
            // Try multiple reliable upload services with CORS handling
            const uploadServices = [
                {
                    name: 'imgur',
                    upload: async () => {
                        const formData = new FormData();
                        formData.append('image', blob);
                        
                        const uploadResponse = await fetch('https://api.imgur.com/3/image', {
                            method: 'POST',
                            headers: {
                                'Authorization': 'Client-ID 546c25a59c58ad7'
                            },
                            body: formData
                        });
                        
                        if (uploadResponse.ok) {
                            const data = await uploadResponse.json();
                            if (data.success && data.data && data.data.link) {
                                return data.data.link;
                            }
                        }
                        throw new Error('Imgur upload failed');
                    }
                },
                {
                    name: 'postimages',
                    upload: async () => {
                        const formData = new FormData();
                        formData.append('upload', blob, 'image.jpg');
                        
                        const uploadResponse = await fetch('https://postimages.org/json/rr', {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (uploadResponse.ok) {
                            const data = await uploadResponse.json();
                            if (data.status === 'OK' && data.url) {
                                return data.url;
                            }
                        }
                        throw new Error('PostImages upload failed');
                    }
                },
                {
                    name: 'imgbb',
                    upload: async () => {
                        // Convert blob to base64
                        const base64 = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result.split(',')[1]);
                            reader.readAsDataURL(blob);
                        });
                        
                        const formData = new FormData();
                        formData.append('image', base64);
                        
                        const uploadResponse = await fetch('https://api.imgbb.com/1/upload?key=d0b1a1b1f1e1c1d1a1b1c1d1e1f1a1b1', {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (uploadResponse.ok) {
                            const data = await uploadResponse.json();
                            if (data.success && data.data && data.data.url) {
                                return data.data.url;
                            }
                        }
                        throw new Error('ImgBB upload failed');
                    }
                },
                {
                    name: 'smms',
                    upload: async () => {
                        const formData = new FormData();
                        formData.append('smfile', blob, 'image.jpg');
                        
                        const uploadResponse = await fetch('https://sm.ms/api/v2/upload', {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (uploadResponse.ok) {
                            const data = await uploadResponse.json();
                            if (data.success && data.data && data.data.url) {
                                return data.data.url;
                            }
                        }
                        throw new Error('SM.MS upload failed');
                    }
                },
                {
                    name: 'telegra.ph',
                    upload: async () => {
                        const formData = new FormData();
                        formData.append('file', blob, 'image.jpg');
                        
                        const uploadResponse = await fetch('https://telegra.ph/upload', {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (uploadResponse.ok) {
                            const data = await uploadResponse.json();
                            if (data && data[0] && data[0].src) {
                                return 'https://telegra.ph' + data[0].src;
                            }
                        }
                        throw new Error('telegra.ph upload failed');
                    }
                }
            ];
            
            // Try each service
            for (const service of uploadServices) {
                try {
                    console.log(`Trying ${service.name}...`);
                    const url = await service.upload();
                    if (url) {
                        console.log(`${service.name} upload successful: ${url}`);
                        return url;
                    }
                } catch (error) {
                    console.log(`${service.name} upload failed:`, error);
                    continue;
                }
            }
            
            throw new Error('Semua layanan upload gambar tidak tersedia');
            
        } catch (error) {
            throw new Error('Tidak dapat mengupload gambar: ' + error.message);
        }
    }

    async shortenUrl() {
        const urlInput = document.getElementById('url-input');
        const url = urlInput.value.trim();
        
        if (!url) {
            this.showNotification('Silakan masukkan URL', 'error');
            return;
        }
        
        if (!this.isValidUrl(url)) {
            this.showNotification('Silakan masukkan URL yang valid', 'error');
            return;
        }

        this.showLoading(true);
        
        try {
            // Using ferdev API for shortlink
            const apiUrl = `https://api.ferdev.my.id/tools/shortlink?link=${encodeURIComponent(url)}&apikey=yogaapi28`;
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.result) {
                    const resultArea = document.getElementById('shortlink-result');
                    const shortenedUrlInput = document.getElementById('shortened-url');
                    
                    shortenedUrlInput.value = data.result;
                    resultArea.style.display = 'block';
                    
                    this.showNotification('URL berhasil diperpendek!', 'success');
                } else {
                    throw new Error('Invalid response from shortlink service');
                }
            } else {
                throw new Error(`API Error: ${response.status}`);
            }
        } catch (error) {
            this.showNotification('Error memperpendek URL: ' + error.message, 'error');
        }
        
        this.showLoading(false);
    }

    async generateQR() {
        const text = document.getElementById('qr-text').value.trim();
        
        if (!text) {
            this.showNotification('Silakan masukkan teks untuk dikonversi', 'error');
            return;
        }

        this.showLoading(true);
        
        try {
            // Use ferdev API to generate QR code
            const apiUrl = `https://api.ferdev.my.id/tools/text2qr?text=${encodeURIComponent(text)}&apikey=yogaapi28`;
            
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                // Get the image blob from the response
                const imageBlob = await response.blob();
                const imageUrl = URL.createObjectURL(imageBlob);
                
                // Create an image element to display the QR code
                const resultArea = document.getElementById('qr-result');
                const qrPreview = document.querySelector('.qr-preview');
                
                // Clear previous content
                qrPreview.innerHTML = '';
                
                // Create image element
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = 'Generated QR Code';
                img.style.borderRadius = '15px';
                img.style.boxShadow = '6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light)';
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                
                qrPreview.appendChild(img);
                
                // Store the image URL for download
                this.currentQRImage = imageUrl;
                
                resultArea.style.display = 'block';
                this.showNotification('QR code berhasil dibuat!', 'success');
            } else {
                throw new Error(`API Error: ${response.status}`);
            }
            
        } catch (error) {
            this.showNotification('Error membuat QR code: ' + error.message, 'error');
        }
        
        this.showLoading(false);
    }

    downloadQR() {
        if (this.currentQRImage) {
            const link = document.createElement('a');
            link.download = 'qr-code.png';
            link.href = this.currentQRImage;
            link.click();
            
            this.showNotification('QR code berhasil diunduh!', 'success');
        } else {
            this.showNotification('Tidak ada QR code untuk diunduh', 'error');
        }
    }

    async generateIphoneQuote() {
        const messageText = document.getElementById('iphone-message').value.trim();
        const time = document.getElementById('iphone-time').value.trim();
        const carrierName = document.getElementById('iphone-carrier').value.trim();
        const batteryPercentage = document.getElementById('iphone-battery').value;
        const signalStrength = document.getElementById('iphone-signal').value;
        
        if (!messageText) {
            this.showNotification('Silakan masukkan teks pesan', 'error');
            return;
        }

        this.showLoading(true);
        
        try {
            // Use local API endpoint to avoid CORS issues
            const apiUrl = `/api/iphone-quote?` +
                `time=${encodeURIComponent(time)}&` +
                `messageText=${encodeURIComponent(messageText)}&` +
                `carrierName=${encodeURIComponent(carrierName)}&` +
                `batteryPercentage=${encodeURIComponent(batteryPercentage)}&` +
                `signalStrength=${encodeURIComponent(signalStrength)}`;
            
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                // Get the image blob from the response
                const imageBlob = await response.blob();
                const imageUrl = URL.createObjectURL(imageBlob);
                
                // Display the result
                const resultArea = document.getElementById('iphone-result');
                const previewImg = document.getElementById('iphone-preview-img');
                
                previewImg.src = imageUrl;
                previewImg.style.borderRadius = '15px';
                previewImg.style.boxShadow = '6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light)';
                previewImg.style.maxWidth = '100%';
                previewImg.style.height = 'auto';
                
                // Store the image URL for download
                this.currentIphoneImage = imageUrl;
                
                resultArea.style.display = 'block';
                this.showNotification('iPhone quote berhasil dibuat!', 'success');
            } else {
                throw new Error(`API Error: ${response.status}`);
            }
            
        } catch (error) {
            this.showNotification('Error membuat iPhone quote: ' + error.message, 'error');
        }
        
        this.showLoading(false);
    }

    async checkGardenStock() {
        this.showLoading(true);
        
        try {
            // Use local API endpoint to avoid CORS issues
            const apiUrl = '/api/garden-stock';
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.data) {
                    this.displayGardenStock(data.data);
                    this.showNotification('Stock berhasil dimuat!', 'success');
                } else {
                    throw new Error('Invalid response from garden stock API');
                }
            } else {
                throw new Error(`API Error: ${response.status}`);
            }
            
        } catch (error) {
            this.showNotification('Error memuat stock: ' + error.message, 'error');
        }
        
        this.showLoading(false);
    }

    displayGardenStock(data) {
        // Show stock container
        const stockContainer = document.getElementById('stock-container');
        stockContainer.style.display = 'block';

        // Display weather info
        this.displayWeatherInfo(data.weather);

        // Display each category
        this.displayStockCategory('seeds', data.seeds);
        this.displayStockCategory('gear', data.gear);
        this.displayStockCategory('eggs', data.eggs);
        this.displayStockCategory('cosmetics', data.cosmetics);
        this.displayStockCategory('events', data.events);
        
        // Display traveling merchant
        this.displayTravelingMerchant(data.travelingMerchant, data.honey);
    }

    displayWeatherInfo(weather) {
        const weatherInfo = document.getElementById('weather-info');
        const weatherType = document.getElementById('weather-type');
        const weatherEffects = document.getElementById('weather-effects');
        
        if (weather) {
            weatherType.textContent = `Current Weather: ${weather.type} ${weather.active ? '(Active)' : '(Inactive)'}`;
            
            if (weather.effects && weather.effects.length > 0) {
                weatherEffects.innerHTML = weather.effects.map(effect => 
                    `<div class="weather-effect">• ${effect}</div>`
                ).join('');
            }
            
            weatherInfo.style.display = 'block';
        }
    }

    displayStockCategory(category, items) {
        const grid = document.getElementById(`${category}-grid`);
        
        if (!items || items.length === 0) {
            grid.innerHTML = '<div class="no-items">No items available</div>';
            return;
        }

        grid.innerHTML = items.map(item => `
            <div class="stock-item ${item.available ? 'available' : 'unavailable'}">
                <div class="item-name">${item.name}</div>
                <div class="item-quantity">Qty: ${item.quantity}</div>
                <div class="item-status ${item.available ? 'in-stock' : 'out-of-stock'}">
                    ${item.available ? 'Available' : 'Out of Stock'}
                </div>
            </div>
        `).join('');
    }

    displayTravelingMerchant(merchant, honeyItems) {
        const merchantInfo = document.getElementById('merchant-info');
        const honeyGrid = document.getElementById('honey-grid');
        
        if (merchant) {
            merchantInfo.innerHTML = `
                <div class="merchant-details">
                    <h4>${merchant.merchantName}</h4>
                    <div class="merchant-times">
                        <div>Arrived: ${merchant.arrivedAt}</div>
                        <div>Leaves: ${merchant.leavesAt}</div>
                    </div>
                </div>
            `;
            
            if (honeyItems && honeyItems.length > 0) {
                honeyGrid.innerHTML = honeyItems.map(item => `
                    <div class="stock-item ${item.available ? 'available' : 'unavailable'}">
                        <div class="item-name">${item.name}</div>
                        <div class="item-quantity">Qty: ${item.quantity}</div>
                        <div class="item-status ${item.available ? 'in-stock' : 'out-of-stock'}">
                            ${item.available ? 'Available' : 'Out of Stock'}
                        </div>
                    </div>
                `).join('');
            } else {
                honeyGrid.innerHTML = '<div class="no-items">No merchant items available</div>';
            }
        } else {
            merchantInfo.innerHTML = '<div class="no-merchant">No traveling merchant currently</div>';
            honeyGrid.innerHTML = '';
        }
    }

    downloadResult(tool) {
        if (tool === 'tohitam' && this.currentProcessedImage) {
            const link = document.createElement('a');
            link.download = 'processed-image.png';
            link.href = this.currentProcessedImage;
            link.click();
            
            this.showNotification('Image downloaded!', 'success');
        } else if (tool === 'iphone' && this.currentIphoneImage) {
            const link = document.createElement('a');
            link.download = 'iphone-quote.png';
            link.href = this.currentIphoneImage;
            link.click();
            
            this.showNotification('iPhone quote berhasil diunduh!', 'success');
        }
    }

    copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        element.select();
        element.setSelectionRange(0, 99999); // For mobile devices
        
        try {
            document.execCommand('copy');
            this.showNotification('Copied to clipboard!', 'success');
        } catch (err) {
            // Fallback for modern browsers
            navigator.clipboard.writeText(element.value).then(() => {
                this.showNotification('Copied to clipboard!', 'success');
            }).catch(() => {
                this.showNotification('Failed to copy to clipboard', 'error');
            });
        }
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    generateRandomId() {
        return Math.random().toString(36).substr(2, 8);
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = show ? 'block' : 'none';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add notification styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 2rem;
                    right: 2rem;
                    background: var(--gradient-primary);
                    border-radius: 15px;
                    padding: 1rem 1.5rem;
                    box-shadow: 9px 9px 16px var(--shadow-dark), -9px -9px 16px var(--shadow-light);
                    z-index: 3000;
                    animation: slideInRight 0.3s ease;
                    max-width: 300px;
                }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .notification-success i { color: #48bb78; }
                .notification-error i { color: #f56565; }
                .notification-info i { color: var(--accent-color); }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }
}

// Global functions for HTML onclick events
function openTool(toolName) {
    const modal = document.getElementById(`${toolName}-modal`);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function processToHitam() {
    yogaXDTools.processToHitam();
}

function shortenUrl() {
    yogaXDTools.shortenUrl();
}

function generateQR() {
    yogaXDTools.generateQR();
}

function downloadQR() {
    yogaXDTools.downloadQR();
}

function generateIphoneQuote() {
    yogaXDTools.generateIphoneQuote();
}

function checkGardenStock() {
    yogaXDTools.checkGardenStock();
}

function downloadResult(tool) {
    yogaXDTools.downloadResult(tool);
}

function copyToClipboard(elementId) {
    yogaXDTools.copyToClipboard(elementId);
}

// Initialize the application
let yogaXDTools;
document.addEventListener('DOMContentLoaded', () => {
    yogaXDTools = new YogaXDTools();
});

// Add some interactive animations
document.addEventListener('DOMContentLoaded', () => {
    // Animate tool cards on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            }
        });
    }, observerOptions);

    // Add animation styles
    const animationStyle = document.createElement('style');
    animationStyle.textContent = `
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .tool-card {
            opacity: 0;
        }
    `;
    document.head.appendChild(animationStyle);

    // Observe tool cards
    document.querySelectorAll('.tool-card').forEach(card => {
        observer.observe(card);
    });

    // Add floating animation to icons
    document.querySelectorAll('.tool-icon').forEach((icon, index) => {
        icon.style.animation = `float 3s ease-in-out infinite ${index * 0.5}s`;
    });

    // Add float animation
    const floatStyle = document.createElement('style');
    floatStyle.textContent = `
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
    `;
    document.head.appendChild(floatStyle);
});
