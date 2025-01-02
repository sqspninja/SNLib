(function (global) {
    const SNLib = {
        settings: {
            currentPageEnabled: false, // Default: Disable automatic fetching for the current page
            debug: false, // Enable or disable debug logging
        },

        emittedEvents: new Map(), // Track emitted events

        /**
         * Fetch JSON for the current page.
         * @param {string} [format='json'] - Query string format (e.g., 'json', 'json-pretty').
         * @param {string|null} [key=null] - Optional key to extract specific data from JSON.
         * @returns {Promise<any>} - Returns the JSON data or a specific key.
         *
         * Usage Example:
         * SNLib.settings.currentPageEnabled = true;
         * SNLib.fetchCurrentPage('json', 'title')
         *     .then((data) => console.log('Current page title:', data))
         *     .catch((err) => console.error(err));
         */
        async fetchCurrentPage(format = 'json', key = null) {
            if (!this.settings.currentPageEnabled) {
                console.warn('Fetching for the current page is disabled.');
                return null;
            }
            const path = location.pathname;
            return this.fetchPage(path, format, key);
        },

        /**
         * Fetch JSON for a specific page.
         * @param {string} path - The path to fetch (e.g., '/blog').
         * @param {string} [format='json'] - Query string format (e.g., 'json', 'json-pretty').
         * @param {string|null} [key=null] - Optional key to extract specific data from JSON.
         * @returns {Promise<any>} - Returns the JSON data or a specific key.
         *
         * Usage Example:
         * SNLib.fetchPage('/blog', 'json', 'items')
         *     .then((data) => console.log('Blog items:', data))
         *     .catch((err) => console.error(err));
         */
        async fetchPage(path, format = 'json', key = null) {
            const url = `${path}?format=${format}`;
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.status}`);
                }
                const data = await response.json();
                return key ? data[key] : data;
            } catch (error) {
                console.error(`Error fetching page ${path}:`, error);
                return null;
            }
        },

        /**
         * Observe an element's visibility in the viewport.
         * @param {Element} element - The DOM element to observe.
         * @param {Function} onEnter - Callback when the element enters the viewport.
         * @param {Function} onLeave - Callback when the element leaves the viewport.
         * @param {Object} [options={}] - Custom IntersectionObserver options.
         * @returns {IntersectionObserver} - Returns the IntersectionObserver instance.
         *
         * Usage Example:
         * const targetElement = document.querySelector('#my-element');
         * SNLib.observeElementVisibility(
         *     targetElement,
         *     (el) => console.log(`${el.id} entered the viewport`),
         *     (el) => console.log(`${el.id} left the viewport`),
         *     { threshold: 0.5 } // Element needs to be 50% visible to trigger
         * );
         */
        observeElementVisibility(element, onEnter, onLeave, options = {}) {
            const defaultOptions = {
                root: null,
                rootMargin: "0px",
                threshold: 0.1,
            };

            const observerOptions = { ...defaultOptions, ...options };

            const visibilityObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        onEnter(entry.target); // When element is in view
                    } else {
                        onLeave(entry.target); // When element is out of view
                    }
                });
            }, observerOptions);

            visibilityObserver.observe(element);
            return visibilityObserver;
        },

        /**
         * Emit a custom event on the document.
         * @param {string} eventName - The name of the event to emit.
         * @param {any} detail - The data to include in the event detail.
         * @param {Object} [options={}] - Additional options (flag to check duplicate events, callback for next action).
         *
         * Usage Example:
         * SNLib.emitCustomEvent('myCustomEvent', { key: 'value' }, {
         *     flag: true,
         *     next: () => console.log('Event emitted successfully.')
         * });
         *
         * document.addEventListener('myCustomEvent', (e) => {
         *     console.log('Received event:', e.detail);
         * });
         */
        emitCustomEvent(eventName, detail, options = {}) {
            const { flag = false, next = null } = options;

            if (flag && this.emittedEvents.has(eventName)) {
                console.warn(`Event ${eventName} has already been emitted.`);
                return;
            }

            const customEvent = new CustomEvent(eventName, { detail });
            document.dispatchEvent(customEvent);
            this.emittedEvents.set(eventName, true); // Mark the event as emitted

            if (typeof next === 'function') {
                next(); // Execute the provided callback
            }
        },

        /**
         * Load a library (JS or CSS) dynamically.
         * @param {string} src - The source URL of the library to load.
         * @param {Function|null} [callback=null] - Optional callback to execute after the library is loaded.
         * @returns {Promise<void>} - Resolves when the library is successfully loaded.
         *
         * Usage Examples:
         *
         * // Example 1: Inline callback
         * SNLib.loadLibrary('https://cdn.example.com/script.js', () => {
         *     console.log('Inline callback: Library loaded successfully.');
         * }).catch((err) => console.error('Error loading library:', err));
         *
         * // Example 2: Preset callback function
         * function handleLibraryLoaded() {
         *     console.log('Preset callback: Library loaded successfully.');
         * }
         * SNLib.loadLibrary('https://cdn.example.com/styles.css', handleLibraryLoaded)
         *     .catch((err) => console.error('Error loading library:', err));
         *
         * // Example 3: Without catch (optional error handling)
         * SNLib.loadLibrary('https://cdn.example.com/another-script.js', () => {
         *     console.log('No explicit error handling, library loaded.');
         * });
         */
        loadLibrary(src, callback = null) {
            return new Promise((resolve, reject) => {
                let element;

                if (src.endsWith(".css")) {
                    element = document.createElement("link");
                    element.href = src;
                    element.rel = "stylesheet";
                } else {
                    element = document.createElement("script");
                    element.src = src;
                }

                element.onload = () => {
                    if (typeof callback === 'function') {
                        callback(); // Execute the optional callback
                    }
                    resolve();
                };

                element.onerror = () => reject(new Error(`Failed to load ${src}`));
                document.head.appendChild(element);
            });
        },

        /**
         * Wait for Squarespace to be ready and override `afterBodyLoad`.
         *
         * Usage Example:
         * SNLib.waitForSquarespace(() => {
         *     console.log("Squarespace is ready!");
         * });
         */
        waitForSquarespace(callback) {
            if (window.Squarespace && window.Squarespace.afterBodyLoad) {
                callback();
            } else {
                setTimeout(() => this.waitForSquarespace(callback), 50); // Retry after 50ms
            }
        },

        /**
         * Utility to manage and query window dimensions.
         *
         * Usage Example:
         * SNLib.manageWindow.init();
         * const dimensions = SNLib.manageWindow.getDimensions();
         * console.log(`Width: ${dimensions.width}, Height: ${dimensions.height}`);
         * SNLib.manageWindow.destroy();
         */
        manageWindow: {
            cachedWidth: window.innerWidth,
            cachedHeight: window.innerHeight,
            throttledUpdate: null, // Placeholder for the throttled update function

            /**
             * Initialize the window utility by caching dimensions and adding a throttled resize event listener.
             */
            init() {
                // Use SNLib's internal throttle to limit update calls
                this.throttledUpdate = SNLib.throttle(this.updateDimensions.bind(this), 200);
                this.updateDimensions();
                window.addEventListener("resize", this.throttledUpdate);
            },

            /**
             * Update cached window dimensions.
             */
            updateDimensions() {
                this.cachedWidth = window.innerWidth;
                this.cachedHeight = window.innerHeight;
            },

            /**
             * Get the current cached dimensions of the window.
             * @returns {Object} An object containing `width` and `height` properties.
             */
            getDimensions() {
                return { width: this.cachedWidth, height: this.cachedHeight };
            },

            /**
             * Clean up the window utility by removing the resize event listener.
             */
            destroy() {
                if (this.throttledUpdate) {
                    window.removeEventListener("resize", this.throttledUpdate);
                }
            },
        },

        /**
         * Check if the screen matches mobile dimensions based on a given width threshold.
         * 
         * @param {number} [maxWidth=766] - The width threshold for detecting mobile screens.
         * @returns {Object} An object containing `isMobile`, `screenWidth`, `screenHeight`, `isPortrait`, and `isLandscape`.
         *
         * Usage Example:
         * const screenInfo = SNLib.isMobileScreen(768);
         * console.log(`Is mobile: ${screenInfo.isMobile}`);
         */
        isMobileScreen(maxWidth = 766) {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;

            return {
                isMobile: screenWidth <= maxWidth,
                screenWidth,
                screenHeight,
                isPortrait: screenHeight > screenWidth,
                isLandscape: screenWidth > screenHeight,
            };
        },

        /**
         * Wait for a specific DOM element to be available.
         *
         * @param {string} selector - The CSS selector for the element to wait for.
         * @param {Function} callback - The callback function to execute when the element is found.
         *
         * Usage Example:
         * SNLib.waitForElement("#myElement", (element) => {
         *     console.log("Element found:", element);
         * });
         */
        waitForElement(selector, callback) {
            const element = document.querySelector(selector);
            if (element) {
                callback(element);
                return;
            }

            const observer = new MutationObserver(() => {
                const target = document.querySelector(selector);
                if (target) {
                    callback(target);
                    observer.disconnect();
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        },
    };

    // Attach to global scope
    global.SNLib = SNLib;
})(window);