(function (global) {
    const SNLib = {
        settings: {
            currentPageEnabled: false, // Default: Disable automatic fetching for the current page
            debug: false, // Enable or disable debug logging
        },

        isReady: false, // Indicates if SNLib is ready
        version: "1.0.0", // Version number
        emittedEvents: new Map(), // Track emitted events
        _readyCallbacks: [], // Queue for ready callbacks
        _waitingForSquarespace: false, // Prevent duplicate readiness checks

        /**
         * Automatically initialize and wait for Squarespace's `afterBodyLoad`.
         */
        init() {
            this.waitForSquarespace();
        },

        /**
         * Register a custom script to run after Squarespace and SNLib are fully ready.
         * @param {Function} script - The custom script to execute.
         *
         * Usage Example:
         * SNLib.runAfterReady(() => {
         *     console.log("Squarespace is ready, and this custom script is running!");
         * });
         */
        runAfterReady(script) {
            if (this.isReady) {
                script(); // Run immediately if already ready
            } else {
                this._readyCallbacks.push(script); // Queue for later execution
            }
        },

        /**
         * Wait for Squarespace's `afterBodyLoad` and execute queued callbacks when ready.
         */
        waitForSquarespace() {
            if (this.isReady) {
                // Already ready, execute queued callbacks immediately
                while (this._readyCallbacks.length > 0) {
                    const cb = this._readyCallbacks.shift();
                    cb();
                }
                return;
            }

            if (!this._waitingForSquarespace) {
                this._waitingForSquarespace = true;

                const executeCallbacks = () => {
                    this.isReady = true; // Mark SNLib as ready
                    while (this._readyCallbacks.length > 0) {
                        const cb = this._readyCallbacks.shift();
                        cb();
                    }
                };

                if (window.Squarespace && window.Squarespace.afterBodyLoad) {
                    executeCallbacks();
                } else {
                    const interval = setInterval(() => {
                        if (window.Squarespace && window.Squarespace.afterBodyLoad) {
                            clearInterval(interval);
                            executeCallbacks();
                        }
                    }, 50); // Retry every 50ms
                }
            }
        },

        /**
         * Fetch JSON for the current page.
         * @param {string} [format='json'] - Query string format (e.g., 'json', 'json-pretty').
         * @param {string|null} [key=null] - Optional key to extract specific data from JSON.
         * @returns {Promise<any>} - Returns the JSON data or a specific key.
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
         * Log debug messages if debug mode is enabled.
         * @param {string} message - The debug message to log.
         *
         * Usage Example:
         * SNLib.settings.debug = true;
         * SNLib.logDebug("This is a debug message.");
         */
        logDebug(message) {
            if (this.settings.debug) {
                console.debug(`[SNLib Debug]: ${message}`);
            }
        },

        /**
         * Check if a library is loaded by its global object name.
         * @param {string} globalName - The global object name (e.g., "jQuery").
         * @returns {boolean} - True if the library is loaded.
         *
         * Usage Example:
         * if (SNLib.isLibraryLoaded("jQuery")) {
         *     console.log("jQuery is loaded!");
         * }
         */
        isLibraryLoaded(globalName) {
            return !!globalThis[globalName];
        },

        /**
         * Debounce a function to limit its execution rate.
         * @param {Function} func - The function to debounce.
         * @param {number} delay - The delay in milliseconds.
         * @returns {Function} - The debounced function.
         *
         * Usage Example:
         * const debouncedFunc = SNLib.debounce(() => console.log("Debounced!"), 300);
         * window.addEventListener("resize", debouncedFunc);
         */
        debounce(func, delay) {
            let timer;
            return function (...args) {
                clearTimeout(timer);
                timer = setTimeout(() => func.apply(this, args), delay);
            };
        },

        /**
         * Throttle a function to limit its execution rate.
         * @param {Function} func - The function to throttle.
         * @param {number} limit - The throttle limit in milliseconds.
         * @returns {Function} - The throttled function.
         *
         * Usage Example:
         * const throttledFunc = SNLib.throttle(() => console.log("Throttled!"), 300);
         * window.addEventListener("resize", throttledFunc);
         */
        throttle(func, limit) {
            let lastCall = 0;
            return function (...args) {
                const now = Date.now();
                if (now - lastCall >= limit) {
                    lastCall = now;
                    func.apply(this, args);
                }
            };
        },
    };

    // Automatically initialize SNLib
    SNLib.init();

    // Attach to global scope
    global.SNLib = SNLib;
})(window);