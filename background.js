// Background script para Manhwa Smart Reader
class BackgroundManager {
    constructor() {
        this.stats = {
            totalPagesRead: 0,
            totalReadingTime: 0,
            sessions: 0
        };
        
        this.init();
    }

    init() {
        this.loadStats();
        this.setupEventListeners();
    }

    async loadStats() {
        try {
            const result = await chrome.storage.local.get(['manhwaReaderStats']);
            if (result.manhwaReaderStats) {
                this.stats = { ...this.stats, ...result.manhwaReaderStats };
            }
        } catch (error) {
            console.log('Usando estadísticas por defecto');
        }
    }

    async saveStats() {
        try {
            await chrome.storage.local.set({ manhwaReaderStats: this.stats });
        } catch (error) {
            console.error('Error guardando estadísticas:', error);
        }
    }

    setupEventListeners() {
        // Escuchar mensajes del content script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        });

        // Manejar instalación de la extensión
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });

        // Manejar activación de pestañas
        chrome.tabs.onActivated.addListener((activeInfo) => {
            this.handleTabActivation(activeInfo);
        });

        // Manejar actualización de pestañas
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });
    }

    handleMessage(message, sender, sendResponse) {
        switch (message.type) {
            case 'updateStats':
                this.updateStats(message.stats);
                break;
            case 'getStats':
                sendResponse({ stats: this.stats });
                break;
            case 'sessionStart':
                this.stats.sessions++;
                this.saveStats();
                break;
            case 'sessionEnd':
                this.saveStats();
                break;
        }
    }

    updateStats(newStats) {
        this.stats.totalPagesRead += newStats.pagesRead || 0;
        this.stats.totalReadingTime += newStats.readingTime || 0;
        this.saveStats();
    }

    handleInstallation(details) {
        if (details.reason === 'install') {
            // Primera instalación
            this.showWelcomeNotification();
        } else if (details.reason === 'update') {
            // Actualización
            this.showUpdateNotification();
        }
    }

    handleTabActivation(activeInfo) {
        // Notificar al content script sobre el cambio de pestaña
        chrome.tabs.sendMessage(activeInfo.tabId, { 
            type: 'tabActivated' 
        }).catch(() => {
            // Ignorar errores si el content script no está cargado
        });
    }

    handleTabUpdate(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.url) {
            // Verificar si es un sitio de manhwa
            if (this.isManhwaSite(tab.url)) {
                this.showManhwaDetectedNotification(tab);
            }
        }
    }

    isManhwaSite(url) {
        const manhwaDomains = [
            'webtoons.com',
            'mangadex.org',
            'mangakakalot.com',
            'manganelo.com',
            'readmanganato.com',
            'mangareader.to',
            'mangasee123.com',
            'mangafox.la',
            'mangapark.net',
            'mangago.me',
            'mangarock.com',
            'mangastream.com',
            'mangafreak.net',
            'mangahub.io',
            'mangakakalot.com',
            'manganato.com',
            'mangadex.cc',
            'mangadex.tv',
            'mangadex.com',
            'mangadex.net'
        ];

        return manhwaDomains.some(domain => url.includes(domain));
    }

    showWelcomeNotification() {
        try {
            if (chrome.notifications && chrome.notifications.create) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: '¡Bienvenido a Manhwa Smart Reader!',
                    message: 'Tu extensión de lectura inteligente está lista. Haz clic en el botón flotante para comenzar.'
                });
            } else {
                console.log('API de notificaciones no disponible.');
            }
        } catch (e) {
            console.log('No se pudo mostrar la notificación:', e.message);
        }
    }

    showUpdateNotification() {
        try {
            if (chrome.notifications && chrome.notifications.create) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Manhwa Smart Reader Actualizado',
                    message: 'Nuevas características disponibles. ¡Disfruta de una mejor experiencia de lectura!'
                });
            } else {
                console.log('API de notificaciones no disponible.');
            }
        } catch (e) {
            console.log('No se pudo mostrar la notificación:', e.message);
        }
    }

    showManhwaDetectedNotification(tab) {
        try {
            if (chrome.notifications && chrome.notifications.create) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Sitio de Manhwa Detectado',
                    message: `Manhwa Smart Reader está disponible en ${new URL(tab.url).hostname}`
                });
            } else {
                console.log('API de notificaciones no disponible.');
            }
        } catch (e) {
            console.log('No se pudo mostrar la notificación:', e.message);
        }
    }
}

// Inicializar el background manager
new BackgroundManager();

// Manejar contexto de la extensión
chrome.runtime.onStartup.addListener(() => {
    console.log('Manhwa Smart Reader iniciado');
});

chrome.runtime.onSuspend.addListener(() => {
    console.log('Manhwa Smart Reader suspendido');
}); 