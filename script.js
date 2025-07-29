class PixelArtEditor {
    constructor() {
        this.originalImage = null;
        this.originalCanvas = document.getElementById('originalCanvas');
        this.pixelCanvas = document.getElementById('pixelCanvas');
        this.originalCtx = this.originalCanvas.getContext('2d');
        this.pixelCtx = this.pixelCanvas.getContext('2d');
        
        this.settings = {
            pixelSize: 10,
            contrast: 100,
            brightness: 100,
            saturation: 100
        };
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Controls
        const controls = ['pixelSize', 'contrast', 'brightness', 'saturation'];
        controls.forEach(control => {
            const slider = document.getElementById(control);
            const valueDisplay = document.getElementById(control + 'Value');
            
            slider.addEventListener('input', (e) => {
                this.settings[control] = parseInt(e.target.value);
                valueDisplay.textContent = e.target.value;
                this.updatePixelArt();
            });
        });
        
        // Buttons
        document.getElementById('resetBtn').addEventListener('click', this.resetSettings.bind(this));
        document.getElementById('downloadBtn').addEventListener('click', this.downloadImage.bind(this));
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.loadImage(files[0]);
        }
    }
    
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.loadImage(file);
        }
    }
    
    loadImage(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.displayOriginalImage();
                this.updatePixelArt();
                document.getElementById('editorSection').style.display = 'block';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    displayOriginalImage() {
        const img = this.originalImage;
        const maxWidth = 400;
        const maxHeight = 400;
        
        let { width, height } = this.calculateDimensions(img.width, img.height, maxWidth, maxHeight);
        
        this.originalCanvas.width = width;
        this.originalCanvas.height = height;
        
        this.originalCtx.drawImage(img, 0, 0, width, height);
    }
    
    calculateDimensions(imgWidth, imgHeight, maxWidth, maxHeight) {
        let width = imgWidth;
        let height = imgHeight;
        
        if (width > height) {
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
        } else {
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }
        }
        
        return { width, height };
    }
    
    updatePixelArt() {
        if (!this.originalImage) return;
        
        const img = this.originalImage;
        const { width, height } = this.calculateDimensions(img.width, img.height, 400, 400);
        
        // Create a temporary canvas for processing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        // Draw original image
        tempCtx.drawImage(img, 0, 0, width, height);
        
        // Apply filters
        this.applyFilters(tempCtx, width, height);
        
        // Apply pixelation
        this.applyPixelation(tempCtx, width, height);
        
        // Display result
        this.pixelCanvas.width = width;
        this.pixelCanvas.height = height;
        this.pixelCtx.drawImage(tempCanvas, 0, 0);
    }
    
    applyFilters(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            // Apply brightness
            const brightnessFactor = (this.settings.brightness - 100) / 100;
            r = Math.max(0, Math.min(255, r + (brightnessFactor * 255)));
            g = Math.max(0, Math.min(255, g + (brightnessFactor * 255)));
            b = Math.max(0, Math.min(255, b + (brightnessFactor * 255)));
            
            // Apply contrast
            const contrastFactor = (this.settings.contrast - 100) / 100;
            const factor = 1 + contrastFactor;
            r = Math.max(0, Math.min(255, ((r - 128) * factor) + 128));
            g = Math.max(0, Math.min(255, ((g - 128) * factor) + 128));
            b = Math.max(0, Math.min(255, ((b - 128) * factor) + 128));
            
            // Apply saturation
            const saturationFactor = this.settings.saturation / 100;
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = Math.max(0, Math.min(255, gray + saturationFactor * (r - gray)));
            g = Math.max(0, Math.min(255, gray + saturationFactor * (g - gray)));
            b = Math.max(0, Math.min(255, gray + saturationFactor * (b - gray)));
            
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    applyPixelation(ctx, width, height) {
        const pixelSize = this.settings.pixelSize;
        
        // Create a smaller canvas for pixelation
        const smallCanvas = document.createElement('canvas');
        const smallCtx = smallCanvas.getContext('2d');
        const smallWidth = Math.floor(width / pixelSize);
        const smallHeight = Math.floor(height / pixelSize);
        
        smallCanvas.width = smallWidth;
        smallCanvas.height = smallHeight;
        
        // Draw scaled down version
        smallCtx.drawImage(ctx.canvas, 0, 0, smallWidth, smallHeight);
        
        // Clear the original canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw pixelated version
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(smallCanvas, 0, 0, width, height);
    }
    
    resetSettings() {
        this.settings = {
            pixelSize: 10,
            contrast: 100,
            brightness: 100,
            saturation: 100
        };
        
        // Update sliders
        document.getElementById('pixelSize').value = 10;
        document.getElementById('contrast').value = 100;
        document.getElementById('brightness').value = 100;
        document.getElementById('saturation').value = 100;
        
        // Update displays
        document.getElementById('pixelSizeValue').textContent = '10';
        document.getElementById('contrastValue').textContent = '100';
        document.getElementById('brightnessValue').textContent = '100';
        document.getElementById('saturationValue').textContent = '100';
        
        this.updatePixelArt();
    }
    
    downloadImage() {
        if (!this.pixelCanvas) return;
        
        const link = document.createElement('a');
        link.download = 'pixel-art.png';
        link.href = this.pixelCanvas.toDataURL();
        link.click();
    }
}

// Initialize the editor when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PixelArtEditor();
}); 