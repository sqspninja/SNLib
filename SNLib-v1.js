(function (global) {
    const SNLib = {
        settings: {
            currentPageEnabled: false, // Default: Disable automatic fetching for the current page
        },

        emittedEvents: new Map(), // Track emitted events

        /**
         * Fetch JSON for the current page.
         * @param {string} [format='json'] - Query string format (e.g., 'json', 'json-pretty').
         * @param {string|null} [key=null] - Optional key to extract specific data from JSON.
         * @returns {Promise<any>} - Returns the JSON data or a specific key.
         *
         * Usage Example:
         * // Enable fetching for the current page
         * SNLib.settings.currentPageEnabled = true;
         *
         * // Fetch the current page JSON
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
         * // Fetch JSON for a specific page
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
         * // Emit a custom event
         * SNLib.emitCustomEvent('myCustomEvent', { key: 'value' }, {
         *     flag: true, // Prevent duplicate emissions
         *     next: () => console.log('Event emitted successfully.')
         * });
         *
         * // Listen for the event
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
         * @returns {Promise<void>} - Resolves when the library is successfully loaded.
         *
         * Usage Example:
         * // Load a JavaScript library
         * SNLib.loadLibrary('https://cdn.example.com/script.js')
         *     .then(() => console.log('Library loaded successfully.'))
         *     .catch((err) => console.error(err));
         *
         * // Load a CSS library
         * SNLib.loadLibrary('https://cdn.example.com/styles.css')
         *     .then(() => console.log('CSS loaded successfully.'))
         *     .catch((err) => console.error(err));
         */
        async loadLibrary(src) {
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
                element.onload = () => resolve();
                element.onerror = () => reject(new Error(`Failed to load ${src}`));
                document.head.appendChild(element);
            });
        },
    };

    // Attach to global scope
    global.SNLib = SNLib;
})(window);