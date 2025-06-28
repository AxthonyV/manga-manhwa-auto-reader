class ManhwaSmartReader {
    constructor() {
        this.isActive = false;
        this.isPaused = false;
        this.currentSpeed = 1.0;
        this.baseSpeed = 2000; // ms por página
        this.scrollInterval = null;
        this.contentAnalysis = {
            imageCount: 0,
            textDensity: 0,
            complexity: 0
        };
        this.settings = {
            readingSpeed: 'normal', // slow, normal, fast
            autoDetect: true,
            smoothScroll: true,
            smartPause: false
        };
        this.stats = {
            pagesRead: 0,
            readingTime: 0,
            avgSpeed: 0,
            startTime: null
        };
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.createUI();
        this.analyzePage();
        this.setupEventListeners();
        this.setupMessageHandlers();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['manhwaReaderSettings']);
            if (result.manhwaReaderSettings) {
                this.settings = { ...this.settings, ...result.manhwaReaderSettings };
            }
            // Si no hay customSpeed, poner valor por defecto
            if (!this.settings.customSpeed) this.settings.customSpeed = 2000;
        } catch (error) {
            this.settings.customSpeed = 2000;
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({ manhwaReaderSettings: this.settings });
        } catch (error) {
            console.error('Error guardando configuración:', error);
        }
    }

    analyzePage() {
        // Detectar imágenes de manhwa
        const images = document.querySelectorAll('img');
        this.contentAnalysis.imageCount = images.length;
        
        // Analizar densidad de texto
        const textElements = document.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6');
        let totalTextLength = 0;
        textElements.forEach(el => {
            if (el.textContent) {
                totalTextLength += el.textContent.trim().length;
            }
        });
        
        this.contentAnalysis.textDensity = totalTextLength;
        
        // Calcular complejidad basada en imágenes y texto
        this.contentAnalysis.complexity = this.calculateComplexity();
        
        console.log('Análisis de página:', this.contentAnalysis);
    }

    calculateComplexity() {
        const imageWeight = this.contentAnalysis.imageCount * 0.4;
        const textWeight = Math.min(this.contentAnalysis.textDensity / 100, 1) * 0.6;
        return Math.min(imageWeight + textWeight, 1);
    }

    getScrollSpeed() {
        if (this.settings.readingSpeed === 'custom') {
            return this.settings.customSpeed || this.baseSpeed;
        }
        if (this.settings.readingSpeed === 'fast') {
            return 800; // Pro: siempre 800ms por scroll
        }
        let speed = this.settings.customSpeed || this.baseSpeed;
        // Ajustar velocidad según complejidad
        if (this.contentAnalysis.complexity > 0.7) {
            speed *= 2.0;
        } else if (this.contentAnalysis.complexity > 0.4) {
            speed *= 1.4;
        } else {
            speed *= 1.1;
        }
        // Ajustar según velocidad de lectura del usuario
        switch (this.settings.readingSpeed) {
            case 'slow':
                speed *= 1.5;
                break;
            default:
                speed *= 1.0;
        }
        return speed / this.currentSpeed;
    }

    startAutoScroll() {
        if (this.isActive) return;
        this.isActive = true;
        this.isPaused = false;
        this.stats.startTime = Date.now();
        chrome.runtime.sendMessage({ type: 'sessionStart' });
        this.notifyStatus();
        const speed = this.getScrollSpeed();
        this.scrollInterval = setInterval(() => {
            if (this.isPaused) return;
            const currentPosition = window.pageYOffset;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            if (currentPosition >= maxScroll) {
                this.stopAutoScroll();
                return;
            }
            // Determinar el tamaño del salto
            let scrollSize = 180;
            if (this.settings.readingSpeed === 'custom') {
                scrollSize = this.settings.customScrollSize || 180;
            }
            if (this.settings.smoothScroll) {
                this.smoothScrollTo(currentPosition + scrollSize);
            } else {
                window.scrollBy(0, scrollSize);
            }
            this.updateStats();
        }, speed);
        this.updateUI();
        this.notifyStatus();
    }

    smoothScrollTo(targetY) {
        const startY = window.pageYOffset;
        const distance = targetY - startY;
        const duration = 500;
        let start = null;
        
        const animation = (currentTime) => {
            if (start === null) start = currentTime;
            const timeElapsed = currentTime - start;
            const progress = Math.min(timeElapsed / duration, 1);
            
            const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            const run = easeInOutQuad(progress);
            
            window.scrollTo(0, startY + distance * run);
            
            if (timeElapsed < duration) {
                requestAnimationFrame(animation);
            }
        };
        
        requestAnimationFrame(animation);
    }

    stopAutoScroll() {
        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
            this.scrollInterval = null;
        }
        this.isActive = false;
        this.isPaused = false;
        chrome.runtime.sendMessage({ type: 'sessionEnd' });
        this.updateUI();
        this.notifyStatus();
    }

    pauseAutoScroll() {
        this.isPaused = !this.isPaused;
        this.updateUI();
        this.notifyStatus();
    }

    updateStats() {
        if (this.stats.startTime) {
            this.stats.readingTime = Math.floor((Date.now() - this.stats.startTime) / 1000);
            this.stats.avgSpeed = this.stats.pagesRead > 0 ? 
                this.stats.readingTime / this.stats.pagesRead : 0;
        }
    }

    createUI() {
        // Crear panel de control flotante
        const panel = document.createElement('div');
        panel.id = 'manhwa-reader-panel';
        panel.innerHTML = `
            <div class="reader-header">
                <span class="reader-title">📖 Manhwa Reader</span>
                <button class="reader-close" id="reader-close">×</button>
            </div>
            <div class="reader-controls">
                <button class="reader-btn" id="reader-play-pause">
                    <span class="play-icon">▶️</span>
                    <span class="pause-icon" style="display:none;">⏸️</span>
                </button>
                <button class="reader-btn" id="reader-stop">⏹️</button>
                <div class="speed-controls">
                    <label>Velocidad:</label>
                    <select id="reader-speed">
                        <option value="slow">Lenta</option>
                        <option value="normal" selected>Normal</option>
                        <option value="fast">Rápida</option>
                    </select>
                </div>
            </div>
            <div class="reader-info">
                <div class="info-item">
                    <span>Imágenes: <span id="image-count">0</span></span>
                </div>
                <div class="info-item">
                    <span>Complejidad: <span id="complexity">0%</span></span>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Crear botón de activación
        const toggleBtn = document.createElement('div');
        toggleBtn.id = 'manhwa-reader-toggle';
        toggleBtn.innerHTML = '📖';
        toggleBtn.title = 'Activar Manhwa Reader';
        document.body.appendChild(toggleBtn);
        
        this.updateUI();
    }

    updateUI() {
        const panel = document.getElementById('manhwa-reader-panel');
        const playPauseBtn = document.getElementById('reader-play-pause');
        const playIcon = playPauseBtn.querySelector('.play-icon');
        const pauseIcon = playPauseBtn.querySelector('.pause-icon');
        const imageCount = document.getElementById('image-count');
        const complexity = document.getElementById('complexity');
        const speedSelect = document.getElementById('reader-speed');
        const toggleBtn = document.getElementById('manhwa-reader-toggle');
        
        if (this.isActive) {
            panel.classList.add('active');
            toggleBtn.classList.add('active');
            if (this.isPaused) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'inline';
            } else {
                playIcon.style.display = 'inline';
                pauseIcon.style.display = 'none';
            }
        } else {
            panel.classList.remove('active');
            toggleBtn.classList.remove('active');
        }
        
        imageCount.textContent = this.contentAnalysis.imageCount;
        complexity.textContent = Math.round(this.contentAnalysis.complexity * 100) + '%';
        speedSelect.value = this.settings.readingSpeed;
    }

    setupEventListeners() {
        // Botón de activación
        document.getElementById('manhwa-reader-toggle').addEventListener('click', () => {
            const panel = document.getElementById('manhwa-reader-panel');
            panel.classList.toggle('visible');
        });
        
        // Controles
        document.getElementById('reader-play-pause').addEventListener('click', () => {
            if (this.isActive) {
                this.pauseAutoScroll();
            } else {
                this.startAutoScroll();
            }
        });
        
        document.getElementById('reader-stop').addEventListener('click', () => {
            this.stopAutoScroll();
        });
        
        document.getElementById('reader-close').addEventListener('click', () => {
            document.getElementById('manhwa-reader-panel').classList.remove('visible');
        });
        
        document.getElementById('reader-speed').addEventListener('change', (e) => {
            this.settings.readingSpeed = e.target.value;
            this.saveSettings();
            if (this.isActive) {
                this.stopAutoScroll();
                this.startAutoScroll();
            }
        });
        
        // Atajos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === ' ') {
                e.preventDefault();
                if (this.isActive) {
                    this.pauseAutoScroll();
                } else {
                    this.startAutoScroll();
                }
            }
        });
    }

    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        });
    }

    handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'start':
                this.startAutoScroll();
                break;
            case 'pause':
                this.pauseAutoScroll();
                break;
            case 'stop':
                this.stopAutoScroll();
                break;
            case 'setSpeed':
                this.settings.readingSpeed = message.speed;
                this.saveSettings();
                if (this.isActive) {
                    this.stopAutoScroll();
                    this.startAutoScroll();
                }
                break;
            case 'setSetting':
                this.settings[message.setting] = message.value;
                this.saveSettings();
                break;
            case 'setThemeStyle':
                this.applyThemeStyle(message.theme);
                break;
            case 'getStatus':
                this.notifyStatus();
                break;
            case 'getStats':
                this.notifyStats();
                break;
            case 'getPageInfo':
                this.notifyPageInfo();
                break;
            case 'showPanel':
                document.getElementById('manhwa-reader-panel').classList.add('visible');
                break;
        }
    }

    applyThemeStyle(theme) {
        document.body.classList.remove('theme-futurista', 'theme-dark', 'theme-clasico');
        document.body.classList.add('theme-' + theme);
    }

    notifyStatus() {
        chrome.runtime.sendMessage({
            type: 'status',
            isActive: this.isActive,
            isPaused: this.isPaused
        });
    }

    notifyStats() {
        chrome.runtime.sendMessage({
            type: 'stats',
            stats: this.stats
        });
    }

    notifyPageInfo() {
        chrome.runtime.sendMessage({
            type: 'pageInfo',
            pageInfo: {
                images: this.contentAnalysis.imageCount,
                complexity: this.contentAnalysis.complexity,
                estimatedTime: Math.round(this.getScrollSpeed() / 1000)
            }
        });
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ManhwaSmartReader();
    });
} else {
    new ManhwaSmartReader();
} 