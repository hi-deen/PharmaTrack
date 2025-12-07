const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const levels = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = levels[LOG_LEVEL] || levels.info;

function shouldLog(level) {
  return levels[level] >= currentLevel;
}

function formatLog(level, message, data) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data && { data })
  });
}

export const logger = {
  debug: (message, data) => {
    if (shouldLog("debug")) console.log(formatLog("debug", message, data));
  },
  info: (message, data) => {
    if (shouldLog("info")) console.log(formatLog("info", message, data));
  },
  warn: (message, data) => {
    if (shouldLog("warn")) console.warn(formatLog("warn", message, data));
  },
  error: (message, err) => {
    if (shouldLog("error")) console.error(formatLog("error", message, {
      error: err?.message,
      stack: err?.stack
    }));
  }
};
