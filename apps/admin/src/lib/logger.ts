export const createLogger = (scope: string) => ({
  error(message: string, error?: unknown, ...args: unknown[]) {
    if (error !== undefined) {
      console.error(`[${scope}] [ERROR] ${message}`, error, ...args);
    } else {
      console.error(`[${scope}] [ERROR] ${message}`, ...args);
    }
  },

  warn(message: string, ...args: unknown[]) {
    console.warn(`[${scope}] [WARN] ${message}`, ...args);
  },

  info(message: string, ...args: unknown[]) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(`[${scope}] [INFO] ${message}`, ...args);
    }
  },

  debug(message: string, ...args: unknown[]) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug(`[${scope}] [DEBUG] ${message}`, ...args);
    }
  },
});
