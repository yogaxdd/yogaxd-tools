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
            // Convert image to base64 without data URL prefix for API
            const base64Data = this.originalImageData.split(',')[1];
            
            // Use ferdev ToHitam API with base64 data
            const response = await fetch('https://api.ferdev.my.id/maker/tohitam', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: base64Data,
                    apikey: 'yogaapi28'
                })
            });
            
            if (response.ok) {
                // Get the processed image blob
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
                // Fallback to GET method with image upload
                await this.processToHitamFallback();
            }
            
        } catch (error) {
            // Try fallback method
            await this.processToHitamFallback();
        }
        
        this.showLoading(false);
    }

    async processToHitamFallback() {
        try {
            // Upload image to a reliable service first
            const imageUrl = await this.uploadImageReliably(this.originalImageData);
            
            if (!imageUrl) {
                throw new Error('Gagal mengupload gambar');
            }
            
            // Use ferdev ToHitam API with image URL
            const apiUrl = `https://api.ferdev.my.id/maker/tohitam?link=${encodeURIComponent(imageUrl)}&apikey=yogaapi28`;
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                // Get the processed image blob
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
            this.showNotification('Error memproses gambar. Tidak dapat mengupload gambar. Periksa koneksi internet stabil dan coba lagi.', 'error');
        }
    }

    async uploadImageReliably(imageDataUrl) {
        try {
            // Convert data URL to blob
            const response = await fetch(imageDataUrl);
            const blob = await response.blob();
            
            // Try multiple upload services in sequence
            const uploadServices = [
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
                        throw new Error('Upload failed');
                    }
                },
                {
                    name: 'catbox.moe',
                    upload: async () => {
                        const formData = new FormData();
                        formData.append('reqtype', 'fileupload');
                        formData.append('fileToUpload', blob, 'image.jpg');
                        
                        const uploadResponse = await fetch('https://catbox.moe/user/api.php', {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (uploadResponse.ok) {
                            const url = await uploadResponse.text();
                            if (url.startsWith('https://')) {
                                return url.trim();
                            }
                        }
                        throw new Error('Upload failed');
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
                        throw new Error('Upload failed');
                    }
                }
            ];
            
            // Try each service
            for (const service of uploadServices) {
                try {
                    const url = await service.upload();
                    if (url) {
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

    downloadResult(tool) {
        if (tool === 'tohitam' && this.currentProcessedImage) {
            const link = document.createElement('a');
            link.download = 'processed-image.png';
            link.href = this.currentProcessedImage;
            link.click();
            
            this.showNotification('Image downloaded!', 'success');
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
