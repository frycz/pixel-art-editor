// Feature flags
const FEATURE_FLAGS = {
    ADVANCED_FEATURES: false // Set to true to enable Posterization, Outline Detection, and Edge Detection
};

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
            saturation: 100,
            colorCount: 32,
            quantizationMethod: 'median-cut',
            posterizationLevels: 256,
            paletteSwap: 'none',
            outlineDetection: 'none',
            outlineStrength: 50,
            edgeDetection: 'none',
            edgeStrength: 50
        };
        
        this.initializeEventListeners();
        this.updateFeatureVisibility();
    }
    
    updateFeatureVisibility() {
        // Hide/show advanced features based on feature flag
        const advancedFeatures = ['posterizationLevels', 'outlineDetection', 'outlineStrength', 'edgeDetection', 'edgeStrength'];
        
        advancedFeatures.forEach(feature => {
            const controlGroup = document.querySelector(`[data-control="${feature}"]`);
            if (controlGroup) {
                controlGroup.style.display = FEATURE_FLAGS.ADVANCED_FEATURES ? 'flex' : 'none';
            }
        });
        
        // Hide/show color count based on quantization method
        this.updateColorCountVisibility();
    }
    
    updateColorCountVisibility() {
        const colorCountGroup = document.querySelector('[data-control="colorCount"]');
        if (colorCountGroup) {
            const shouldShow = this.settings.quantizationMethod !== 'none';
            colorCountGroup.style.display = shouldShow ? 'flex' : 'none';
        }
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
        const controls = ['pixelSize', 'contrast', 'brightness', 'saturation', 'colorCount'];
        if (FEATURE_FLAGS.ADVANCED_FEATURES) {
            controls.push('posterizationLevels', 'outlineStrength', 'edgeStrength');
        }
        
        controls.forEach(control => {
            const slider = document.getElementById(control);
            const valueDisplay = document.getElementById(control + 'Value');
            
            if (slider && valueDisplay) {
                slider.addEventListener('input', (e) => {
                    this.settings[control] = parseInt(e.target.value);
                    valueDisplay.textContent = e.target.value;
                    this.updatePixelArt();
                });
            }
        });
        
        // Quantization method selector
        document.getElementById('quantizationMethod').addEventListener('change', (e) => {
            this.settings.quantizationMethod = e.target.value;
            this.updateColorCountVisibility();
            this.updatePixelArt();
        });
        
        // Palette swap selector
        document.getElementById('paletteSwap').addEventListener('change', (e) => {
            this.settings.paletteSwap = e.target.value;
            this.updatePixelArt();
        });
        
        // Outline detection selector (only if feature is enabled)
        if (FEATURE_FLAGS.ADVANCED_FEATURES) {
            document.getElementById('outlineDetection').addEventListener('change', (e) => {
                this.settings.outlineDetection = e.target.value;
                this.updatePixelArt();
            });
        }
        
        // Edge detection selector (only if feature is enabled)
        if (FEATURE_FLAGS.ADVANCED_FEATURES) {
            document.getElementById('edgeDetection').addEventListener('change', (e) => {
                this.settings.edgeDetection = e.target.value;
                this.updatePixelArt();
            });
        }
        
        // Buttons
        document.getElementById('resetBtn').addEventListener('click', this.resetSettings.bind(this));
        document.getElementById('downloadBtn').addEventListener('click', this.downloadImage.bind(this));
        document.getElementById('toggleOriginalBtn').addEventListener('click', this.toggleOriginal.bind(this));
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
                this.makeUploadAreaCompact();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    makeUploadAreaCompact() {
        const uploadArea = document.getElementById('uploadArea');
        const uploadIcon = uploadArea.querySelector('.upload-icon');
        const uploadHint = uploadArea.querySelector('.upload-hint');
        
        // Remove icon and hint, reduce padding
        if (uploadIcon) uploadIcon.style.display = 'none';
        if (uploadHint) uploadHint.style.display = 'none';
        uploadArea.style.padding = '20px';
    }
    
    toggleOriginal() {
        const toggleBtn = document.getElementById('toggleOriginalBtn');
        const originalWrapper = document.getElementById('originalCanvasWrapper');
        const pixelWrapper = document.getElementById('pixelCanvasWrapper');
        const imagesContainer = document.querySelector('.images-container');
        
        const isHidden = originalWrapper.classList.contains('hidden');
        
        if (isHidden) {
            // Show original
            originalWrapper.classList.remove('hidden');
            pixelWrapper.classList.remove('expanded');
            imagesContainer.classList.remove('single-image');
            toggleBtn.textContent = 'Hide Original';
        } else {
            // Hide original
            originalWrapper.classList.add('hidden');
            pixelWrapper.classList.add('expanded');
            imagesContainer.classList.add('single-image');
            toggleBtn.textContent = 'Show Original';
        }
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
        
        // Apply posterization (only if feature is enabled)
        if (FEATURE_FLAGS.ADVANCED_FEATURES) {
            this.applyPosterization(tempCtx, width, height);
        }
        
        // Apply palette swap
        this.applyPaletteSwap(tempCtx, width, height);
        
        // Apply outline detection (only if feature is enabled)
        if (FEATURE_FLAGS.ADVANCED_FEATURES) {
            this.applyOutlineDetection(tempCtx, width, height);
        }
        
        // Apply edge detection (only if feature is enabled)
        if (FEATURE_FLAGS.ADVANCED_FEATURES) {
            this.applyEdgeDetection(tempCtx, width, height);
        }
        
        // Apply color quantization
        if (this.settings.quantizationMethod !== 'none') {
            this.applyColorQuantization(tempCtx, width, height);
        }
        
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
    
    applyColorQuantization(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Extract all unique colors
        const colorMap = new Map();
        for (let i = 0; i < data.length; i += 4) {
            const color = `${data[i]},${data[i + 1]},${data[i + 2]}`;
            colorMap.set(color, (colorMap.get(color) || 0) + 1);
        }
        
        // Generate palette based on method
        let palette;
        switch (this.settings.quantizationMethod) {
            case 'median-cut':
                palette = this.medianCutQuantization(colorMap);
                break;
            case 'k-means':
                palette = this.kMeansQuantization(colorMap);
                break;
            case 'octree':
                palette = this.octreeQuantization(colorMap);
                break;
            default:
                return;
        }
        
        // Replace colors with nearest palette color
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const nearestColor = this.findNearestColor(r, g, b, palette);
            data[i] = nearestColor.r;
            data[i + 1] = nearestColor.g;
            data[i + 2] = nearestColor.b;
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    medianCutQuantization(colorMap) {
        const colors = Array.from(colorMap.keys()).map(color => {
            const [r, g, b] = color.split(',').map(Number);
            return { r, g, b, count: colorMap.get(color) };
        });
        
        const palette = this.medianCut(colors, this.settings.colorCount);
        return palette;
    }
    
    medianCut(colors, targetColors) {
        // Base case: if we have fewer colors than target, return all colors
        if (colors.length <= targetColors) {
            return colors.map(c => ({ r: c.r, g: c.g, b: c.b }));
        }
        
        // Base case: if target is 1, return average color
        if (targetColors <= 1) {
            const avgR = Math.round(colors.reduce((sum, c) => sum + c.r, 0) / colors.length);
            const avgG = Math.round(colors.reduce((sum, c) => sum + c.g, 0) / colors.length);
            const avgB = Math.round(colors.reduce((sum, c) => sum + c.b, 0) / colors.length);
            return [{ r: avgR, g: avgG, b: avgB }];
        }
        
        // Find the color channel with the greatest range
        let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
        colors.forEach(color => {
            minR = Math.min(minR, color.r);
            maxR = Math.max(maxR, color.r);
            minG = Math.min(minG, color.g);
            maxG = Math.max(maxG, color.g);
            minB = Math.min(minB, color.b);
            maxB = Math.max(maxB, color.b);
        });
        
        const rangeR = maxR - minR;
        const rangeG = maxG - minG;
        const rangeB = maxB - minB;
        
        // If all ranges are 0, colors are identical, return average
        if (rangeR === 0 && rangeG === 0 && rangeB === 0) {
            const avgR = Math.round(colors.reduce((sum, c) => sum + c.r, 0) / colors.length);
            const avgG = Math.round(colors.reduce((sum, c) => sum + c.g, 0) / colors.length);
            const avgB = Math.round(colors.reduce((sum, c) => sum + c.b, 0) / colors.length);
            return [{ r: avgR, g: avgG, b: avgB }];
        }
        
        // Sort by the channel with the greatest range
        if (rangeR >= rangeG && rangeR >= rangeB) {
            colors.sort((a, b) => a.r - b.r);
        } else if (rangeG >= rangeB) {
            colors.sort((a, b) => a.g - b.g);
        } else {
            colors.sort((a, b) => a.b - b.b);
        }
        
        // Split at median
        const mid = Math.floor(colors.length / 2);
        const left = colors.slice(0, mid);
        const right = colors.slice(mid);
        
        // Ensure we don't have empty arrays
        if (left.length === 0 || right.length === 0) {
            const avgR = Math.round(colors.reduce((sum, c) => sum + c.r, 0) / colors.length);
            const avgG = Math.round(colors.reduce((sum, c) => sum + c.g, 0) / colors.length);
            const avgB = Math.round(colors.reduce((sum, c) => sum + c.b, 0) / colors.length);
            return [{ r: avgR, g: avgG, b: avgB }];
        }
        
        // Recursively process both halves with proper distribution
        const leftTarget = Math.max(1, Math.floor(targetColors / 2));
        const rightTarget = Math.max(1, targetColors - leftTarget);
        
        const leftPalette = this.medianCut(left, leftTarget);
        const rightPalette = this.medianCut(right, rightTarget);
        
        return [...leftPalette, ...rightPalette];
    }
    
    kMeansQuantization(colorMap) {
        const colors = Array.from(colorMap.keys()).map(color => {
            const [r, g, b] = color.split(',').map(Number);
            return { r, g, b, count: colorMap.get(color) };
        });
        
        // Initialize centroids randomly
        const centroids = [];
        for (let i = 0; i < this.settings.colorCount; i++) {
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            centroids.push({ r: randomColor.r, g: randomColor.g, b: randomColor.b });
        }
        
        // K-means clustering
        for (let iteration = 0; iteration < 10; iteration++) {
            const clusters = Array.from({ length: this.settings.colorCount }, () => []);
            
            // Assign colors to nearest centroid
            colors.forEach(color => {
                let minDistance = Infinity;
                let nearestCentroid = 0;
                
                centroids.forEach((centroid, index) => {
                    const distance = this.colorDistance(color, centroid);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestCentroid = index;
                    }
                });
                
                clusters[nearestCentroid].push(color);
            });
            
            // Update centroids
            centroids.forEach((centroid, index) => {
                if (clusters[index].length > 0) {
                    const avgR = clusters[index].reduce((sum, c) => sum + c.r, 0) / clusters[index].length;
                    const avgG = clusters[index].reduce((sum, c) => sum + c.g, 0) / clusters[index].length;
                    const avgB = clusters[index].reduce((sum, c) => sum + c.b, 0) / clusters[index].length;
                    
                    centroid.r = Math.round(avgR);
                    centroid.g = Math.round(avgG);
                    centroid.b = Math.round(avgB);
                }
            });
        }
        
        return centroids;
    }
    
    octreeQuantization(colorMap) {
        const colors = Array.from(colorMap.keys()).map(color => {
            const [r, g, b] = color.split(',').map(Number);
            return { r, g, b, count: colorMap.get(color) };
        });
        
        // Build octree
        const octree = this.buildOctree(colors);
        
        // Reduce octree to target number of colors
        this.reduceOctree(octree, this.settings.colorCount);
        
        // Extract palette from octree leaves
        const palette = [];
        this.extractPalette(octree, palette);
        
        return palette;
    }
    
    buildOctree(colors) {
        const root = { children: [], isLeaf: false, colors: [] };
        
        colors.forEach(color => {
            this.insertColor(root, color, 0);
        });
        
        return root;
    }
    
    insertColor(node, color, level) {
        if (level === 8) {
            node.isLeaf = true;
            node.colors.push(color);
            return;
        }
        
        const index = this.getOctreeIndex(color, level);
        if (!node.children[index]) {
            node.children[index] = { children: [], isLeaf: false, colors: [] };
        }
        
        this.insertColor(node.children[index], color, level + 1);
    }
    
    getOctreeIndex(color, level) {
        const shift = 7 - level;
        const r = (color.r >> shift) & 1;
        const g = (color.g >> shift) & 1;
        const b = (color.b >> shift) & 1;
        return (r << 2) | (g << 1) | b;
    }
    
    reduceOctree(node, targetColors) {
        if (node.isLeaf) return;
        
        const leaves = this.getLeaves(node);
        if (leaves.length <= targetColors) return;
        
        // Sort leaves by color count and merge smallest
        leaves.sort((a, b) => a.colors.length - b.colors.length);
        
        while (leaves.length > targetColors) {
            const leaf = leaves.shift();
            leaf.isLeaf = false;
            leaf.children = [];
        }
    }
    
    getLeaves(node) {
        const leaves = [];
        this.collectLeaves(node, leaves);
        return leaves;
    }
    
    collectLeaves(node, leaves) {
        if (node.isLeaf) {
            leaves.push(node);
        } else {
            node.children.forEach(child => {
                if (child) this.collectLeaves(child, leaves);
            });
        }
    }
    
    extractPalette(node, palette) {
        if (node.isLeaf && node.colors.length > 0) {
            const avgR = node.colors.reduce((sum, c) => sum + c.r, 0) / node.colors.length;
            const avgG = node.colors.reduce((sum, c) => sum + c.g, 0) / node.colors.length;
            const avgB = node.colors.reduce((sum, c) => sum + c.b, 0) / node.colors.length;
            
            palette.push({
                r: Math.round(avgR),
                g: Math.round(avgG),
                b: Math.round(avgB)
            });
        } else {
            node.children.forEach(child => {
                if (child) this.extractPalette(child, palette);
            });
        }
    }
    
    findNearestColor(r, g, b, palette) {
        let minDistance = Infinity;
        let nearestColor = palette[0];
        
        palette.forEach(color => {
            const distance = this.colorDistance({ r, g, b }, color);
            if (distance < minDistance) {
                minDistance = distance;
                nearestColor = color;
            }
        });
        
        return nearestColor;
    }
    
    colorDistance(color1, color2) {
        const dr = color1.r - color2.r;
        const dg = color1.g - color2.g;
        const db = color1.b - color2.b;
        return dr * dr + dg * dg + db * db;
    }
    
    applyPosterization(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const levels = this.settings.posterizationLevels;
        
        // Calculate step size for each color level
        const step = 256 / levels;
        
        for (let i = 0; i < data.length; i += 4) {
            // Posterize each color channel
            data[i] = Math.round(data[i] / step) * step;     // Red
            data[i + 1] = Math.round(data[i + 1] / step) * step; // Green
            data[i + 2] = Math.round(data[i + 2] / step) * step; // Blue
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    applyPaletteSwap(ctx, width, height) {
        if (this.settings.paletteSwap === 'none') return;
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            switch (this.settings.paletteSwap) {
                case 'grayscale':
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                    data[i] = gray;
                    data[i + 1] = gray;
                    data[i + 2] = gray;
                    break;
                    
                case 'sepia':
                    const sepiaR = (r * 0.393) + (g * 0.769) + (b * 0.189);
                    const sepiaG = (r * 0.349) + (g * 0.686) + (b * 0.168);
                    const sepiaB = (r * 0.272) + (g * 0.534) + (b * 0.131);
                    data[i] = Math.min(255, sepiaR);
                    data[i + 1] = Math.min(255, sepiaG);
                    data[i + 2] = Math.min(255, sepiaB);
                    break;
                    
                case 'cool':
                    data[i] = Math.min(255, r * 0.8);
                    data[i + 1] = Math.min(255, g * 0.9);
                    data[i + 2] = Math.min(255, b * 1.2);
                    break;
                    
                case 'warm':
                    data[i] = Math.min(255, r * 1.2);
                    data[i + 1] = Math.min(255, g * 1.1);
                    data[i + 2] = Math.min(255, b * 0.8);
                    break;
                    
                case 'vintage':
                    const vintageR = (r * 0.567) + (g * 0.769) + (b * 0.189);
                    const vintageG = (r * 0.349) + (g * 0.686) + (b * 0.168);
                    const vintageB = (r * 0.272) + (g * 0.534) + (b * 0.131);
                    data[i] = Math.min(255, vintageR * 1.1);
                    data[i + 1] = Math.min(255, vintageG * 0.9);
                    data[i + 2] = Math.min(255, vintageB * 0.8);
                    break;
                    
                case 'neon':
                    const brightness = (r + g + b) / 3;
                    const neonFactor = brightness / 255;
                    data[i] = Math.min(255, r + (255 - r) * neonFactor * 0.5);
                    data[i + 1] = Math.min(255, g + (255 - g) * neonFactor * 0.3);
                    data[i + 2] = Math.min(255, b + (255 - b) * neonFactor * 0.8);
                    break;
                    
                case 'pastel':
                    data[i] = Math.min(255, (r + 255) / 2);
                    data[i + 1] = Math.min(255, (g + 255) / 2);
                    data[i + 2] = Math.min(255, (b + 255) / 2);
                    break;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    applyOutlineDetection(ctx, width, height) {
        if (this.settings.outlineDetection === 'none') return;
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const strength = this.settings.outlineStrength / 100;
        
        // Convert to grayscale for edge detection
        const grayData = new Uint8ClampedArray(width * height);
        for (let i = 0; i < data.length; i += 4) {
            grayData[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        
        const edgeData = new Uint8ClampedArray(width * height);
        
        switch (this.settings.outlineDetection) {
            case 'simple':
                this.simpleOutlineDetection(grayData, edgeData, width, height);
                break;
            case 'sobel':
                this.sobelOutlineDetection(grayData, edgeData, width, height);
                break;
            case 'canny':
                this.cannyOutlineDetection(grayData, edgeData, width, height);
                break;
            case 'laplacian':
                this.laplacianOutlineDetection(grayData, edgeData, width, height);
                break;
        }
        
        // Apply edges to original image
        for (let i = 0; i < data.length; i += 4) {
            const edgeValue = edgeData[i / 4];
            const edgeFactor = (edgeValue / 255) * strength;
            
            // Create black outlines where edges are detected
            if (edgeFactor > 0.05) { // Lower threshold for more visible outlines
                const outlineIntensity = Math.min(1, edgeFactor * 3); // Amplify the effect
                data[i] = Math.max(0, data[i] - (outlineIntensity * 255));     // Red
                data[i + 1] = Math.max(0, data[i + 1] - (outlineIntensity * 255)); // Green
                data[i + 2] = Math.max(0, data[i + 2] - (outlineIntensity * 255)); // Blue
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    simpleOutlineDetection(grayData, edgeData, width, height) {
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                const current = grayData[idx];
                
                // Check 8 neighbors
                const neighbors = [
                    grayData[idx - width - 1], grayData[idx - width], grayData[idx - width + 1],
                    grayData[idx - 1], grayData[idx + 1],
                    grayData[idx + width - 1], grayData[idx + width], grayData[idx + width + 1]
                ];
                
                let maxDiff = 0;
                for (const neighbor of neighbors) {
                    maxDiff = Math.max(maxDiff, Math.abs(current - neighbor));
                }
                
                // Enhance edge detection sensitivity
                edgeData[idx] = maxDiff > 20 ? maxDiff * 2 : 0;
            }
        }
    }
    
    sobelOutlineDetection(grayData, edgeData, width, height) {
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                let gx = 0, gy = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixel = grayData[(y + ky) * width + (x + kx)];
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        gx += pixel * sobelX[kernelIdx];
                        gy += pixel * sobelY[kernelIdx];
                    }
                }
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                // Enhance Sobel sensitivity
                edgeData[idx] = magnitude > 30 ? Math.min(255, magnitude * 1.5) : 0;
            }
        }
    }
    
    cannyOutlineDetection(grayData, edgeData, width, height) {
        // Simplified Canny: Gaussian blur + Sobel + threshold
        const blurred = new Uint8ClampedArray(width * height);
        
        // Simple Gaussian blur
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                let sum = 0;
                let count = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        sum += grayData[(y + ky) * width + (x + kx)];
                        count++;
                    }
                }
                
                blurred[idx] = sum / count;
            }
        }
        
        // Apply Sobel to blurred image
        this.sobelOutlineDetection(blurred, edgeData, width, height);
        
        // Threshold - make more sensitive
        for (let i = 0; i < edgeData.length; i++) {
            edgeData[i] = edgeData[i] > 25 ? edgeData[i] * 2 : 0;
        }
    }
    
    laplacianOutlineDetection(grayData, edgeData, width, height) {
        const laplacian = [0, -1, 0, -1, 4, -1, 0, -1, 0];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                let sum = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixel = grayData[(y + ky) * width + (x + kx)];
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        sum += pixel * laplacian[kernelIdx];
                    }
                }
                
                // Enhance Laplacian sensitivity
                const absSum = Math.abs(sum);
                edgeData[idx] = absSum > 15 ? Math.min(255, absSum * 2) : 0;
            }
        }
    }
    
    applyEdgeDetection(ctx, width, height) {
        if (this.settings.edgeDetection === 'none') return;
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const strength = this.settings.edgeStrength / 100;
        
        // Convert to grayscale for edge detection
        const grayData = new Uint8ClampedArray(width * height);
        for (let i = 0; i < data.length; i += 4) {
            grayData[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        
        const edgeData = new Uint8ClampedArray(width * height);
        
        switch (this.settings.edgeDetection) {
            case 'sobel':
                this.sobelEdgeDetection(grayData, edgeData, width, height);
                break;
            case 'canny':
                this.cannyEdgeDetection(grayData, edgeData, width, height);
                break;
            case 'laplacian':
                this.laplacianEdgeDetection(grayData, edgeData, width, height);
                break;
        }
        
        // Apply edges to original image
        for (let i = 0; i < data.length; i += 4) {
            const edgeValue = edgeData[i / 4];
            const edgeFactor = (edgeValue / 255) * strength;
            
            // Create black edges where edges are detected
            if (edgeFactor > 0.1) {
                const edgeIntensity = Math.min(1, edgeFactor * 2);
                data[i] = Math.max(0, data[i] - (edgeIntensity * 255));     // Red
                data[i + 1] = Math.max(0, data[i + 1] - (edgeIntensity * 255)); // Green
                data[i + 2] = Math.max(0, data[i + 2] - (edgeIntensity * 255)); // Blue
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    sobelEdgeDetection(grayData, edgeData, width, height) {
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                let gx = 0, gy = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixel = grayData[(y + ky) * width + (x + kx)];
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        gx += pixel * sobelX[kernelIdx];
                        gy += pixel * sobelY[kernelIdx];
                    }
                }
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                edgeData[idx] = Math.min(255, magnitude);
            }
        }
    }
    
    cannyEdgeDetection(grayData, edgeData, width, height) {
        // Simplified Canny: Gaussian blur + Sobel + threshold
        const blurred = new Uint8ClampedArray(width * height);
        
        // Simple Gaussian blur
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                let sum = 0;
                let count = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        sum += grayData[(y + ky) * width + (x + kx)];
                        count++;
                    }
                }
                
                blurred[idx] = sum / count;
            }
        }
        
        // Apply Sobel to blurred image
        this.sobelEdgeDetection(blurred, edgeData, width, height);
        
        // Threshold
        for (let i = 0; i < edgeData.length; i++) {
            edgeData[i] = edgeData[i] > 30 ? edgeData[i] : 0;
        }
    }
    
    laplacianEdgeDetection(grayData, edgeData, width, height) {
        const laplacian = [0, -1, 0, -1, 4, -1, 0, -1, 0];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                let sum = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixel = grayData[(y + ky) * width + (x + kx)];
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        sum += pixel * laplacian[kernelIdx];
                    }
                }
                
                edgeData[idx] = Math.min(255, Math.abs(sum));
            }
        }
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
            saturation: 100,
            colorCount: 32,
            quantizationMethod: 'median-cut',
            posterizationLevels: 256,
            paletteSwap: 'none',
            outlineDetection: 'none',
            outlineStrength: 50,
            edgeDetection: 'none',
            edgeStrength: 50
        };
        
        // Update sliders
        document.getElementById('pixelSize').value = 10;
        document.getElementById('contrast').value = 100;
        document.getElementById('brightness').value = 100;
        document.getElementById('saturation').value = 100;
        document.getElementById('colorCount').value = 32;
        document.getElementById('posterizationLevels').value = 256;
        document.getElementById('outlineStrength').value = 50;
        document.getElementById('edgeStrength').value = 50;
        
        // Update displays
        document.getElementById('pixelSizeValue').textContent = '10';
        document.getElementById('contrastValue').textContent = '100';
        document.getElementById('brightnessValue').textContent = '100';
        document.getElementById('saturationValue').textContent = '100';
        document.getElementById('colorCountValue').textContent = '32';
        document.getElementById('posterizationLevelsValue').textContent = '256';
        document.getElementById('outlineStrengthValue').textContent = '50';
        document.getElementById('edgeStrengthValue').textContent = '50';
        
        // Update selects
        document.getElementById('quantizationMethod').value = 'median-cut';
        document.getElementById('paletteSwap').value = 'none';
        document.getElementById('outlineDetection').value = 'none';
        document.getElementById('edgeDetection').value = 'none';
        
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