/**
 * Cookie Banner Iframe Embed Script
 * @version 1.1.1
 */
(function(window, document) {
    'use strict';
    
    // Configuration - With CDN support
    const IFRAME_HOST = window.CookieBannerConfig?.host || 'https://cdn.jsdelivr.net/gh/SharanuSb/cookie-cdn@v1.1.1/dist/cookie-banner.html';
    console.log('[CookieBanner] Using iframe host:', IFRAME_HOST);
    const VERSION = '1.1.1';
    
    // Debug helper
    const debug = {
        log: function(message, ...args) {
            console.log(`[CookieBanner] ${message}`, ...args);
        },
        error: function(message, ...args) {
            console.error(`[CookieBanner] ${message}`, ...args);
        },
        warn: function(message, ...args) {
            console.warn(`[CookieBanner] ${message}`, ...args);
        }
    };
    
    class CookieBannerEmbed {
        constructor(clientId, options = {}, cdnRoot) {
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
                targetOrigin: '*', // Use * to allow cross-origin communication with iframe
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
                    onError: options.onError || function(error) { console.error('[CookieBanner] Error:', error); }
                }
            };
            
            this.iframe = null;
            this.initialized = false;
            this.initPromise = null;
            
            debug.log('Initialized with config:', {
                clientId: this.clientId,
                apiEndpoint: this.apiEndpoint,
                domain: this.options.domain
            });
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
                    debug.log('Creating iframe...');
                    
                    // Create iframe if it doesn't exist
                    if (!this.iframe) {
                        this.createIframe();
                    }
                    
                    // Set up message event listener
                    this.setupMessageListener();
                    
                    const initTimeout = setTimeout(() => {
                        debug.error('Initialization timed out after 10 seconds');
                        reject(new Error('Cookie banner initialization timeout'));
                    }, 10000);

                    const initListener = (event) => {
                        debug.log('Received message:', event.data);
                        
                        // More lenient origin check for CDN usage
                        if (event.data?.source === 'cookie-banner' && 
                            event.data?.action === 'initialized') {
                            
                            // Only accept messages from our iframe
                            if (this.iframe && event.source === this.iframe.contentWindow) {
                                debug.log('Initialization successful');
                                clearTimeout(initTimeout);
                                window.removeEventListener('message', initListener);
                                this.initialized = true;
                                resolve(this);
                            } else {
                                debug.warn('Got initialization message but source doesn\'t match iframe');
                            }
                        }
                    };

                    window.addEventListener('message', initListener);
                    
                    // Check if iframe fails to load
                    this.iframe.onerror = (error) => {
                        debug.error('Failed to load iframe:', error);
                        clearTimeout(initTimeout);
                        window.removeEventListener('message', initListener);
                        reject(new Error('Failed to load cookie banner iframe'));
                    };
                } catch (error) {
                    debug.error('Error during initialization:', error);
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
            let iframeUrl;

            console.log('IFRAME_HOST', IFRAME_HOST);
            console.log('window.location.origin', window.location.origin);
            console.log('window.location.hostname', window.location.hostname);
        
            
            try {
                console.log('this.cdnRoot', this.cdnRoot);
                iframeUrl = this.cdnRoot + '/cookie-banner.html';
                
                // Add query parameters
                iframeUrl.searchParams.append('clientId', this.clientId);
                iframeUrl.searchParams.append('domain', this.options.domain);
                iframeUrl.searchParams.append('version', this.version);
                console.log('iframeUrl', iframeUrl);
                
                if (this.options.apiEndpoint) {
                    iframeUrl.searchParams.append('endpoint', this.options.apiEndpoint);
                }
                
                const finalUrl = iframeUrl.toString();
                debug.log('Iframe URL:', finalUrl);
                
                // Create iframe element
                const iframe = document.createElement('iframe');
                iframe.src = finalUrl;
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
            } catch (error) {
                debug.error('Error creating iframe URL:', error);
                throw new Error(`Failed to create iframe URL: ${error.message}`);
            }
        }
        
        /**
         * Set up the message event listener for iframe communication
         * @private
         */
        setupMessageListener() {
            window.addEventListener('message', (event) => {
                // More permissive message handling for CDN
                try {
                    // Verify the message is from our iframe
                    if (!this.iframe || !this.iframe.contentWindow) {
                        return;
                    }
                    
                    // Only accept messages from our iframe
                    if (event.source !== this.iframe.contentWindow) {
                        return;
                    }
                    
                    const message = event.data;
                    
                    // Check if the message is from our cookie banner
                    if (!message || message.source !== 'cookie-banner') {
                        return;
                    }
                    
                    const action = message.action;
                    const data = message.data || {};
                    
                    debug.log(`Received action: ${action}`, data);
                    
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
                            this.handleError(new Error(data.message || 'Unknown error from cookie banner'));
                            break;
                            
                        default:
                            debug.warn(`Unknown action received: ${action}`);
                    }
                } catch (error) {
                    debug.error('Error processing message:', error);
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
            debug.error('Error:', error);
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
                debug.log('Showing banner');
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
            debug.log('Hiding banner');
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
                debug.log('Resetting preferences');
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
         * Test API connectivity (debugging method)
         */
        testApiConnection() {
            if (!this.options.apiEndpoint) {
                debug.error('No API endpoint configured');
                return;
            }
            
            const url = `${this.options.apiEndpoint}/${this.clientId}/client`;
            debug.log('Testing API connection to:', url);
            
            fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors'
            })
            .then(response => {
                debug.log('API test response status:', response.status);
                return response.text();
            })
            .then(text => {
                debug.log('API test response length:', text.length);
                try {
                    const json = JSON.parse(text);
                    debug.log('API test parsed response:', json);
                } catch (e) {
                    debug.error('API test failed to parse JSON:', e);
                }
            })
            .catch(error => {
                debug.error('API test fetch error:', error);
            });
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
            
            debug.log(`Sending command: ${action}`, data);
            
            try {
                // Use "*" for targetOrigin to support cross-origin communication
                this.iframe.contentWindow.postMessage({
                    source: 'cookie-banner-parent',
                    action: action,
                    data: data,
                    version: this.version
                }, "*");
            } catch (error) {
                debug.error('Error sending command:', error);
                this.handleError(error);
            }
        }
    }
    
    // Add debugging method to the prototype
    CookieBannerEmbed.prototype._debug = function() {
        return {
            iframe: this.iframe ? {
                src: this.iframe.src,
                contentWindow: !!this.iframe.contentWindow,
                dimensions: {
                    width: this.iframe.style.width,
                    height: this.iframe.style.height
                }
            } : null,
            initialized: this.initialized,
            options: this.options,
            clientId: this.clientId,
            apiEndpoint: this.options.apiEndpoint
        };
    };
    
    // Expose to global scope
    window.CookieBannerEmbed = CookieBannerEmbed;
    
})(window, document);