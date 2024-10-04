const winston = require("winston");

// Define your custom levels if needed
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

// Define the log format
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const transports = [
  new winston.transports.Console({
    level: "debug",
    format: winston.format.combine(winston.format.colorize(), format),
  }),
  // File transport
  new winston.transports.File({
    filename: "logs/app.log",
    level: "info",
    format: format,
  }),
];

// Create the logger instance
const logger = winston.createLogger({
  levels: levels,
  transports: transports,
});

module.exports = logger;
