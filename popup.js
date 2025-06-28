class PopupManager {
    constructor() {
        this.currentTab = null;
        this.isActive = false;
        this.isPaused = false;
        this.currentLanguage = 'en'; // Idioma por defecto
        this.stats = {
            pagesRead: 0,
            readingTime: 0,
            avgSpeed: 0
        };
        this.pageInfo = {
            images: 0,
            complexity: 0,
            estimatedTime: 0
        };
        
        // Sistema de traducciones
        this.translations = {
            en: {
                title: "📖 Manhwa Smart Reader",
                subtitle: "Smart automatic reading",
                "status.inactive": "Inactive",
                "status.active": "Active",
                "status.paused": "Paused",
                "theme.label": "Visual Style:",
                "theme.futuristic": "Futuristic",
                "theme.dark": "Dark Mode",
                "theme.classic": "Classic",
                "controls.title": "🎮 Controls",
                "controls.start": "Start",
                "controls.pause": "Pause",
                "controls.stop": "Stop",
                "speed.title": "⚡ Reading Speed",
                "speed.pro": "Pro",
                "speed.proDesc": "Professional reading",
                "speed.custom": "Custom",
                "speed.customDesc": "Personalized speed",
                "customSpeed.title": "🎚️ Custom Speed",
                "customSpeed.veryFast": "Very fast",
                "customSpeed.fast": "Fast",
                "customSpeed.normal": "Normal",
                "customSpeed.slow": "Slow",
                "customSpeed.verySlow": "Very slow",
                "customSpeed.msPerScroll": "ms per scroll",
                "customSpeed.scrollSize": "Scroll size:",
                "advanced.title": "🔧 Advanced Settings",
                "advanced.autoDetect": "Auto detection",
                "advanced.autoDetectDesc": "Analyze content automatically",
                "advanced.smoothScroll": "Smooth scroll",
                "advanced.smoothScrollDesc": "Fluid transitions",
                "advanced.smartPause": "Smart pause",
                "advanced.smartPauseDesc": "Pause on long dialogues",
                "stats.title": "📊 Reading Statistics",
                "stats.totalTime": "Total time",
                "pageInfo.title": "📄 Page Information",
                "pageInfo.imagesDetected": "Images detected:",
                "pageInfo.complexity": "Complexity:",
                "pageInfo.estimatedTime": "Estimated time:",
                "shortcuts.ctrlSpace": "Shortcut: Ctrl + Space",
                "language.title": "🌐 Language",
                "language.desc": "Choose your language"
            },
            es: {
                title: "📖 Manhwa Smart Reader",
                subtitle: "Lectura inteligente automática",
                "status.inactive": "Inactivo",
                "status.active": "Activo",
                "status.paused": "Pausado",
                "theme.label": "Estilo visual:",
                "theme.futuristic": "Futurista",
                "theme.dark": "Modo Dark",
                "theme.classic": "Clásico",
                "controls.title": "🎮 Controles",
                "controls.start": "Iniciar",
                "controls.pause": "Pausar",
                "controls.stop": "Detener",
                "speed.title": "⚡ Velocidad de Lectura",
                "speed.pro": "Pro",
                "speed.proDesc": "Lectura profesional",
                "speed.custom": "Personalizada",
                "speed.customDesc": "Velocidad personalizada",
                "customSpeed.title": "🎚️ Velocidad Personalizada",
                "customSpeed.veryFast": "Muy rápido",
                "customSpeed.fast": "Rápido",
                "customSpeed.normal": "Normal",
                "customSpeed.slow": "Lento",
                "customSpeed.verySlow": "Muy lento",
                "customSpeed.msPerScroll": "ms por scroll",
                "customSpeed.scrollSize": "Tamaño del scroll:",
                "advanced.title": "🔧 Configuraciones Avanzadas",
                "advanced.autoDetect": "Detección automática",
                "advanced.autoDetectDesc": "Analiza contenido automáticamente",
                "advanced.smoothScroll": "Scroll suave",
                "advanced.smoothScrollDesc": "Transiciones fluidas",
                "advanced.smartPause": "Pausa inteligente",
                "advanced.smartPauseDesc": "Pausa en diálogos largos",
                "stats.title": "📊 Estadísticas de Lectura",
                "stats.totalTime": "Tiempo total",
                "pageInfo.title": "📄 Información de la Página",
                "pageInfo.imagesDetected": "Imágenes detectadas:",
                "pageInfo.complexity": "Complejidad:",
                "pageInfo.estimatedTime": "Tiempo estimado:",
                "shortcuts.ctrlSpace": "Atajo: Ctrl + Espacio",
                "language.title": "🌐 Idioma",
                "language.desc": "Elige tu idioma"
            }
        };
        
        this.init();
    }

    async init() {
        await this.getCurrentTab();
        this.loadLanguagePreference();
        this.setupEventListeners();
        this.loadSettings();
        this.updateUI();
        this.startPeriodicUpdates();
        this.setupThemeStyle();
        this.applyTranslations();
        this.updateLanguageButtons();
    }

    // Cargar preferencia de idioma guardada
    async loadLanguagePreference() {
        try {
            const result = await chrome.storage.sync.get(['manhwaReaderLanguage']);
            if (result.manhwaReaderLanguage) {
                this.currentLanguage = result.manhwaReaderLanguage;
            }
        } catch (error) {
            console.error('Error cargando preferencia de idioma:', error);
        }
    }

    // Guardar preferencia de idioma
    async saveLanguagePreference() {
        try {
            await chrome.storage.sync.set({ manhwaReaderLanguage: this.currentLanguage });
        } catch (error) {
            console.error('Error guardando preferencia de idioma:', error);
        }
    }

    // Cambiar idioma
    changeLanguage(lang) {
        this.currentLanguage = lang;
        this.applyTranslations();
        this.saveLanguagePreference();
        this.updateLanguageButtons();
    }

    // Aplicar traducciones
    applyTranslations() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.translations[this.currentLanguage][key];
            if (translation) {
                element.textContent = translation;
            }
        });
    }

    // Actualizar botones de idioma
    updateLanguageButtons() {
        const langButtons = document.querySelectorAll('.lang-btn');
        langButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-lang') === this.currentLanguage) {
                btn.classList.add('active');
            }
        });
    }

    async getCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;
        } catch (error) {
            console.error('Error obteniendo la pestaña actual:', error);
        }
    }

    setupEventListeners() {
        // Selector de idioma
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.target.getAttribute('data-lang');
                this.changeLanguage(lang);
            });
        });

        // Controles principales
        document.getElementById('start-btn').addEventListener('click', () => {
            this.sendMessage({ action: 'start' });
        });

        document.getElementById('pause-btn').addEventListener('click', () => {
            this.sendMessage({ action: 'pause' });
        });

        document.getElementById('stop-btn').addEventListener('click', () => {
            this.sendMessage({ action: 'stop' });
        });

        // Configuración de velocidad
        document.querySelectorAll('input[name="speed"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isCustom = e.target.value === 'custom';
                document.getElementById('custom-speed').disabled = !isCustom;
                document.getElementById('custom-scroll-size').disabled = !isCustom;
                this.sendMessage({ 
                    action: 'setSpeed', 
                    speed: e.target.value 
                });
            });
        });

        // Configuraciones avanzadas
        document.getElementById('auto-detect').addEventListener('change', (e) => {
            this.sendMessage({ 
                action: 'setSetting', 
                setting: 'autoDetect', 
                value: e.target.checked 
            });
        });

        document.getElementById('smooth-scroll').addEventListener('change', (e) => {
            this.sendMessage({ 
                action: 'setSetting', 
                setting: 'smoothScroll', 
                value: e.target.checked 
            });
        });

        document.getElementById('smart-pause').addEventListener('change', (e) => {
            this.sendMessage({ 
                action: 'setSetting', 
                setting: 'smartPause', 
                value: e.target.checked 
            });
        });

        // Slider de tamaño de scroll personalizado
        const customScrollSize = document.getElementById('custom-scroll-size');
        const customScrollSizeValue = document.getElementById('custom-scroll-size-value');
        customScrollSize.addEventListener('input', (e) => {
            customScrollSizeValue.textContent = e.target.value;
            this.sendMessage({
                action: 'setSetting',
                setting: 'customScrollSize',
                value: parseInt(e.target.value)
            });
        });

        // Slider de velocidad personalizada
        const customSpeed = document.getElementById('custom-speed');
        const customSpeedValue = document.getElementById('custom-speed-value');
        customSpeed.addEventListener('input', (e) => {
            customSpeedValue.textContent = e.target.value;
            this.sendMessage({
                action: 'setSetting',
                setting: 'customSpeed',
                value: parseInt(e.target.value)
            });
        });

        // Escuchar mensajes del content script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message);
        });
    }

    async sendMessage(message) {
        if (!this.currentTab) return;

        try {
            await chrome.tabs.sendMessage(this.currentTab.id, message);
        } catch (error) {
            this.showError('No se pudo conectar con la página. Asegúrate de estar en un sitio web válido o recarga la pestaña.');
            this.setInactiveUI();
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'status':
                this.isActive = message.isActive;
                this.isPaused = message.isPaused;
                this.updateUI();
                break;
            case 'stats':
                this.stats = message.stats;
                this.updateStats();
                break;
            case 'pageInfo':
                this.pageInfo = message.pageInfo;
                this.updatePageInfo();
                break;
            case 'settings':
                this.updateSettingsUI(message.settings);
                break;
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['manhwaReaderSettings']);
            if (result.manhwaReaderSettings) {
                this.updateSettingsUI(result.manhwaReaderSettings);
            }
        } catch (error) {
            console.error('Error cargando configuración:', error);
        }
    }

    updateSettingsUI(settings) {
        // Actualizar velocidad
        const speedRadio = document.querySelector(`input[name="speed"][value="${settings.readingSpeed}"]`);
        if (speedRadio) {
            speedRadio.checked = true;
            document.getElementById('custom-speed').disabled = settings.readingSpeed !== 'custom';
            document.getElementById('custom-scroll-size').disabled = settings.readingSpeed !== 'custom';
        }

        // Actualizar configuraciones avanzadas
        document.getElementById('auto-detect').checked = settings.autoDetect !== false;
        document.getElementById('smooth-scroll').checked = settings.smoothScroll !== false;
        document.getElementById('smart-pause').checked = settings.smartPause === true;

        if (settings.customSpeed) {
            document.getElementById('custom-speed').value = settings.customSpeed;
            document.getElementById('custom-speed-value').textContent = settings.customSpeed;
        }

        if (settings.customScrollSize) {
            document.getElementById('custom-scroll-size').value = settings.customScrollSize;
            document.getElementById('custom-scroll-size-value').textContent = settings.customScrollSize;
        }
    }

    updateUI() {
        const statusIndicator = document.getElementById('status-indicator');
        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const stopBtn = document.getElementById('stop-btn');

        if (this.isActive) {
            statusDot.classList.add('active');
            if (this.isPaused) {
                statusText.textContent = this.translations[this.currentLanguage]['status.paused'];
                startBtn.disabled = false;
                pauseBtn.disabled = false;
                stopBtn.disabled = false;
            } else {
                statusText.textContent = this.translations[this.currentLanguage]['status.active'];
                startBtn.disabled = true;
                pauseBtn.disabled = false;
                stopBtn.disabled = false;
            }
        } else {
            statusDot.classList.remove('active');
            statusText.textContent = this.translations[this.currentLanguage]['status.inactive'];
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = true;
        }
    }

    updateStats() {
        document.getElementById('pages-read').textContent = this.stats.pagesRead;
        document.getElementById('reading-time').textContent = this.formatTime(this.stats.readingTime);
        document.getElementById('avg-speed').textContent = this.stats.avgSpeed.toFixed(1);
    }

    updatePageInfo() {
        document.getElementById('current-images').textContent = this.pageInfo.images;
        document.getElementById('current-complexity').textContent = Math.round(this.pageInfo.complexity * 100) + '%';
        document.getElementById('estimated-time').textContent = this.formatTime(this.pageInfo.estimatedTime);
    }

    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }

    startPeriodicUpdates() {
        // Solicitar actualizaciones periódicas
        setInterval(() => {
            this.sendMessage({ action: 'getStatus' });
            this.sendMessage({ action: 'getStats' });
            this.sendMessage({ action: 'getPageInfo' });
        }, 1000);
    }

    showError(message) {
        // Crear notificación de error temporal
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff4757;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    setInactiveUI() {
        const statusIndicator = document.getElementById('status-indicator');
        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const stopBtn = document.getElementById('stop-btn');
        statusDot.classList.remove('active');
        statusText.textContent = 'Inactivo';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
    }

    setupThemeStyle() {
        const themeRadios = document.querySelectorAll('input[name="theme-style"]');
        // Cargar preferencia guardada
        chrome.storage.sync.get(['themeStyle'], (result) => {
            let theme = result.themeStyle || 'futurista';
            document.body.classList.remove('theme-futurista', 'theme-dark', 'theme-clasico');
            document.body.classList.add('theme-' + theme);
            const themeInput = document.getElementById('theme-' + theme);
            if (themeInput) themeInput.checked = true;
            // Notificar al content script para aplicar el mismo tema
            this.sendMessage({ action: 'setThemeStyle', theme });
        });
        themeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const theme = e.target.value;
                    document.body.classList.remove('theme-futurista', 'theme-dark', 'theme-clasico');
                    document.body.classList.add('theme-' + theme);
                    chrome.storage.sync.set({ themeStyle: theme });
                    // Notificar al content script para aplicar el mismo tema
                    this.sendMessage({ action: 'setThemeStyle', theme });
                }
            });
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});

// Manejar cierre del popup
window.addEventListener('beforeunload', () => {
    // Limpiar cualquier intervalo o listener si es necesario
}); 