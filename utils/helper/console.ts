type ConsoleMethod = 'info' | 'debug' | 'error' | 'warn';

// Define colors for each log level
const COLORS = {
    info: '\x1b[36m',    // Cyan
    debug: '\x1b[35m',   // Magenta
    error: '\x1b[31m',   // Red
    warn: '\x1b[33m',    // Yellow
    reset: '\x1b[0m'     // Reset color
};

// Store original console methods
const originalConsoleMethods = {
    info: console.info,
    debug: console.debug,
    error: console.error,
    warn: console.warn
};

// Create a formatted log function
function createLogFunction(method: ConsoleMethod): typeof console.log {
    return function(...args: any[]) {
        const levelTag = `[${method}]`;

        const coloredLevelTag = `${COLORS[method]}${levelTag}${COLORS.reset}`;

        // Call the original console method with our formatted output
        originalConsoleMethods[method](
            `${coloredLevelTag}`,
            COLORS[method],
            ...args,
            COLORS.reset
        );
    };
}

// Override console methods
export function overrideConsole() {
    console.info = createLogFunction('info');
    console.debug = createLogFunction('debug');
    console.warn = createLogFunction('warn');
    console.error = createLogFunction('error');
}

// Optional: Restore original console methods
export function restoreConsole() {
    console.info = originalConsoleMethods.info;
    console.debug = originalConsoleMethods.debug;
    console.warn = originalConsoleMethods.warn;
    console.error = originalConsoleMethods.error;
}

// Auto-initialize when imported (optional)
overrideConsole();
