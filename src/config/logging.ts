export const loggingConfig = {
  level: process.env.LOGGING_LEVEL ?? 'info',
  maxLogEntrySize: Number(process.env.MAX_LOG_ENTRY_SIZE) || 200000,
};
