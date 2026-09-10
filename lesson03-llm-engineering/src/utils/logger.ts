export const logger = {
  info(message: string, data?: unknown): void {
    if (data === undefined) {
      console.log(`[INFO] ${message}`);
      return;
    }

    console.log(`[INFO] ${message}`, data);
  },

  warn(message: string, data?: unknown): void {
    if (data === undefined) {
      console.warn(`[WARN] ${message}`);
      return;
    }

    console.warn(`[WARN] ${message}`, data);
  },

  error(message: string, error?: unknown): void {
    if (error === undefined) {
      console.error(`[ERROR] ${message}`);
      return;
    }

    console.error(`[ERROR] ${message}`, error);
  },
};