/**
 * Cookie Banner Iframe Embed Script
 * @version 1.1.0
 */
(function(window, document) {
    'use strict';
    
    // Configuration - Replace with your actual host URL for production
    const IFRAME_HOST = window.CookieBannerConfig?.host || '/cookie-banner.html';
    console.log('IFRAME_HOST', IFRAME_HOST, window.CookieBannerConfig?.host);
    const VERSION = '1.1.0';
    
    class CookieBannerEmbed {
        constructor(clientId, options = {}) {
            if (!clientId) {
                throw new Error('Client ID is required');
            }
            
            this.clientId = clientId;
            this.version = VERSION;
            this.apiEndpoint = options.apiEndpoint || null;
            this.options = {
                apiEndpoint: options.apiEndpoint || null,
                domain: options.domain || window.location.hostname,
                sandbox: options.sandbox || 'allow-scripts allow-same-origin allow-forms',
                targetOrigin: options.targetOrigin || window.location.origin,
                callbacks: {
                    onAcceptAll: options.onAcceptAll || function() {},
                    onRejectAll: options.onRejectAll || function() {},
                    onSavePreferences: options.onSavePreferences || function() {},
                    onBannerShown: options.onBannerShown || function() {},
                    onBannerClosed: options.onBannerClosed || function() {},
                    onModalShown: options.onModalShown || function() {},
                    onModalClosed: options.onModalClosed || function() {},
                    onPreferencesChanged: options.onPreferencesChanged || function() {},
                    onInitialized: options.onInitialized || function() {},
                    onError: options.onError || function(error) { console.error('Cookie Banner Error:', error); }
                }
            };
            
            this.iframe = null;
            this.initialized = false;
            this.initPromise = null;
        }
        
        /**
         * Initialize the cookie banner iframe
         * @returns {Promise<CookieBannerEmbed>}
         */
        async init() {
            if (this.initialized) {
                return this;
            }

            if (this.initPromise) {
                return this.initPromise;
            }

            this.initPromise = new Promise((resolve, reject) => {
                try {
                    // Create iframe if it doesn't exist
                    if (!this.iframe) {
                        this.createIframe();
                    }
                    
                    // Set up message event listener
                    this.setupMessageListener();
                    
                    const initTimeout = setTimeout(() => {
                        reject(new Error('Cookie banner initialization timeout'));
                    }, 5000);

                    const initListener = (event) => {
                        if (event.data?.source === 'cookie-banner' && 
                            event.data?.action === 'initialized' &&
                            event.origin === window.location.origin) {
                            clearTimeout(initTimeout);
                            window.removeEventListener('message', initListener);
                            this.initialized = true;
                            resolve(this);
                        }
                    };

                    window.addEventListener('message', initListener);
                } catch (error) {
                    this.handleError(error);
                    reject(error);
                }
            });

            return this.initPromise;
        }
        
        /**
         * Create the iframe element
         * @private
         */
        createIframe() {
            // Build URL with parameters
            let iframeUrl = new URL(IFRAME_HOST, window.location.origin);
            iframeUrl.searchParams.append('clientId', this.clientId);
            iframeUrl.searchParams.append('domain', this.options.domain);
            iframeUrl.searchParams.append('version', this.version);
            
            if (this.options.apiEndpoint) {
                iframeUrl.searchParams.append('endpoint', this.options.apiEndpoint);
            }
            
            // Create iframe element
            const iframe = document.createElement('iframe');
            iframe.src = iframeUrl.toString();
            iframe.sandbox = this.options.sandbox;
            iframe.style.cssText = `
                position: fixed;
                border: none;
                width: 0;
                height: 0;
                opacity: 0;
                pointer-events: none;
                z-index: 2147483647;
                bottom: 0;
                right: 0;
            `;
            iframe.setAttribute('title', 'Cookie Preferences');
            iframe.setAttribute('aria-hidden', 'true');
            iframe.setAttribute('tabindex', '-1');
            iframe.setAttribute('role', 'dialog');
            iframe.setAttribute('aria-label', 'Cookie Preferences Dialog');
            
            // Add iframe to DOM
            document.body.appendChild(iframe);
            
            this.iframe = iframe;
        }
        
        /**
         * Set up the message event listener for iframe communication
         * @private
         */
        setupMessageListener() {
            window.addEventListener('message', (event) => {
                // Verify the message source and origin
                console.log(event, "event")
                if (!this.iframe || 
                    event.source !== this.iframe.contentWindow ||
                    event.origin !== window.location.origin) {
                    return;
                }
                
                const message = event.data;
                console.log(message, "message")
                // Check if the message is from our cookie banner
                if (!message || message.source !== 'cookie-banner') {
                    return;
                }
                
                const action = message.action;
                const data = message.data || {};
                console.log(action, "action")
                console.log(data, "data")
                
                try {
                    // Handle message actions
                    switch (action) {
                        case 'initialized':
                            this.initialized = true;
                            this.resizeIframe(data.hasPreferences ? '0px' : '100%');
                            this.options.callbacks.onInitialized(data);
                            break;
                            
                        case 'bannerShown':
                            this.resizeIframe('100%');
                            this.iframe.style.opacity = '1';
                            this.iframe.style.pointerEvents = 'auto';
                            this.options.callbacks.onBannerShown();
                            break;
                            
                        case 'bannerClosed':
                            this.resizeIframe('0px');
                            this.iframe.style.opacity = '0';
                            this.iframe.style.pointerEvents = 'none';
                            this.options.callbacks.onBannerClosed();
                            break;
                            
                        case 'modalShown':
                            this.resizeIframe('100%');
                            this.iframe.style.opacity = '1';
                            this.iframe.style.pointerEvents = 'auto';
                            this.options.callbacks.onModalShown();
                            break;
                            
                        case 'modalClosed':
                            this.options.callbacks.onModalClosed();
                            break;
                            
                        case 'acceptAll':
                            this.options.callbacks.onAcceptAll(data);
                            break;
                            
                        case 'rejectAll':
                            this.options.callbacks.onRejectAll(data);
                            break;
                            
                        case 'preferencesChanged':
                            this.options.callbacks.onPreferencesChanged(data);
                            this.options.callbacks.onSavePreferences(data);
                            this.applyPreferences(data);
                            break;
                            
                        case 'error':
                            this.handleError(new Error(data.message));
                            break;
                            
                        default:
                            console.warn(`Unknown action received: ${action}`);
                    }
                } catch (error) {
                    this.handleError(error);
                }
            });
        }
        
        /**
         * Handle errors
         * @private
         * @param {Error} error
         */
        handleError(error) {
            console.error('Cookie Banner Error:', error);
            this.options.callbacks.onError(error);
        }
        
        /**
         * Apply cookie preferences to the main window
         * @private
         * @param {Object} preferences 
         */
        applyPreferences(preferences) {
            try {
                // Store preferences in a cookie for server-side processing
                const preferencesJson = JSON.stringify(preferences);
                const encodedPreferences = encodeURIComponent(preferencesJson);
                
                // Set a cookie that stores the preferences
                document.cookie = `cookie_preferences=${encodedPreferences}; path=/; max-age=31536000; SameSite=Lax`;
                
                // Dispatch an event that other scripts can listen to
                const event = new CustomEvent('cookiePreferencesChanged', { 
                    detail: { preferences } 
                });
                window.dispatchEvent(event);
            } catch (error) {
                this.handleError(error);
            }
        }
        
        /**
         * Resize the iframe
         * @private
         * @param {string} size The new size value
         */
        resizeIframe(size) {
            if (!this.iframe) return;
            
            const isFullSize = size === '100%';
            
            if (isFullSize) {
                this.iframe.style.width = '100%';
                this.iframe.style.height = '100%';
                this.iframe.style.top = '0';
                this.iframe.style.left = '0';
                this.iframe.style.right = 'auto';
                this.iframe.style.bottom = 'auto';
            } else {
                this.iframe.style.width = '0';
                this.iframe.style.height = '0';
                this.iframe.style.top = 'auto';
                this.iframe.style.left = 'auto';
                this.iframe.style.right = '0';
                this.iframe.style.bottom = '0';
            }
        }
        
        /**
         * Show the cookie banner
         * @returns {Promise<CookieBannerEmbed>}
         */
        async show() {
            try {
                if (!this.initialized) {
                    await this.init();
                }
                this.sendCommand('show');
                return this;
            } catch (error) {
                this.handleError(error);
                return this;
            }
        }
        
        /**
         * Hide the cookie banner
         * @returns {CookieBannerEmbed}
         */
        hide() {
            this.sendCommand('hide');
            return this;
        }
        
        /**
         * Reset cookie preferences and show the banner
         * @returns {Promise<CookieBannerEmbed>}
         */
        async resetPreferences() {
            try {
                if (!this.initialized) {
                    await this.init();
                }
                this.sendCommand('reset');
                return this;
            } catch (error) {
                this.handleError(error);
                return this;
            }
        }
        
        /**
         * Check if a specific cookie type is allowed
         * @param {string} cookieType The cookie type to check
         * @returns {boolean} True if the cookie type is allowed
         */
        isAllowed(cookieType) {
            try {
                // Get cookie preferences from the cookie
                const match = document.cookie.match(/cookie_preferences=([^;]*)/);
                if (!match) {
                    // If no preferences saved, only necessary cookies are allowed by default
                    return cookieType.toLowerCase() === 'necessary';
                }
                
                const preferencesJson = decodeURIComponent(match[1]);
                const preferences = JSON.parse(preferencesJson);
                return preferences[cookieType.toLowerCase()] === true;
            } catch (error) {
                this.handleError(error);
                return cookieType.toLowerCase() === 'necessary';
            }
        }
        
        /**
         * Send a command to the iframe
         * @private
         * @param {string} action The action to perform
         * @param {Object} data Optional data to send
         */
        sendCommand(action, data = {}) {
            if (!this.iframe || !this.iframe.contentWindow) {
                this.handleError(new Error('Cookie banner iframe not available'));
                return;
            }
            
            this.iframe.contentWindow.postMessage({
                source: 'cookie-banner-parent',
                action: action,
                data: data,
                version: this.version
            }, this.options.targetOrigin);
        }
    }
    
    // Expose to global scope
    window.CookieBannerEmbed = CookieBannerEmbed;
    
})(window, document); 