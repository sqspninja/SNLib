(function (global) {
    const SNLib = {
        settings: {
            currentPageEnabled: false, // Default: Disable automatic fetching for the current page
            debug: true, // Enable debug logging
        },

        isReady: false, // Indicates if SNLib is ready
        inEditor: false, // Flag: Are we in the Squarespace editor?
        activeEditMode: false, // Flag: Is active edit mode triggered?
        version: "1.0.0", // Version number
        emittedEvents: new Map(), // Track emitted events
        _readyCallbacks: [], // Queue for ready callbacks
        _waitingForSquarespace: false, // Prevent duplicate readiness checks

        /**
         * Automatically initialize and wait for Squarespace's `afterBodyLoad`.
         * Also, automatically start observing the editor state.
         */
        init() {
            this.waitForSquarespace();
            this.observeEditor();
        },

        /**
         * Register a custom script to run after Squarespace and SNLib are fully ready.
         */
        ready(script) {
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
                while (this._readyCallbacks.length > 0) {
                    const cb = this._readyCallbacks.shift();
                    cb();
                }
                return;
            }

            if (!this._waitingForSquarespace) {
                this._waitingForSquarespace = true;

                const executeCallbacks = () => {
                    this.isReady = true;
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
                    }, 50);
                }
            }
        },

        /**
         * Fetch JSON for the current page.
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
         */
        logDebug(message) {
            if (this.settings.debug) {
                console.debug(`[SNLib Debug]: ${message}`);
            }
        },

        /**
         * Check if a library is loaded by its global object name.
         */
        isLibraryLoaded(globalName) {
            return !!globalThis[globalName];
        },

        /**
         * Debounce a function to limit its execution rate.
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

        /**
         * Observe the Squarespace editor's state by monitoring body class changes.
         * Uses a debounced MutationObserver to check for the "sqs-edit-mode" (editor)
         * and "sqs-edit-mode-active" (active editing) classes.
         * This method updates SNLib.inEditor and SNLib.activeEditMode.
         */
        observeEditor() {
            if (self === top) {
                this.logDebug("Not running in an iframe; skipping editor observer.");
                return;
            }
            this.logDebug("Running in an iframe, potential Squarespace editor environment.");

            const checkClasses = () => {
                this.logDebug("Current body classes: " + document.body.className);
                if (document.body.classList.contains("sqs-edit-mode")) {
                    this.inEditor = true;
                    this.logDebug("Inside the Squarespace editor.");
                    if (document.body.classList.contains("sqs-edit-mode-active")) {
                        this.activeEditMode = true;
                        this.logDebug("Active edit mode triggered.");
                        // Place custom active edit mode code here
                    } else {
                        this.activeEditMode = false;
                        this.logDebug("Inactive edit mode within the editor.");
                    }
                } else {
                    this.inEditor = false;
                    this.activeEditMode = false;
                    this.logDebug("Not in the Squarespace editor.");
                }
            };

            const debouncedCheckClasses = this.debounce(checkClasses.bind(this), 100);

            // Create a single observer to monitor changes to the body's class attribute
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === "attributes" && mutation.attributeName === "class") {
                        debouncedCheckClasses();
                    }
                });
            });

            observer.observe(document.body, { attributes: true });
            // Perform an initial check immediately
            checkClasses();
        },
    };

    // Automatically initialize SNLib when the library loads
    SNLib.init();

    // Attach SNLib to the global scope
    global.SNLib = SNLib;

    // Log that the library has been initialized
    console.log("SNLib initialized:", global.SNLib);
})(window);