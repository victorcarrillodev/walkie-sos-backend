import winston from 'winston'

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
}

winston.addColors(colors)

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
)

const transports = [
  // 1. Mostrar en consola (con colores)
  new winston.transports.Console(),
  // 2. Guardar errores graves en archivo
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  // 3. Guardar todo en archivo general
  new winston.transports.File({ filename: 'logs/all.log' }),
]

export const Logger = winston.createLogger({
  level: 'debug',
  levels,
  format,
  transports,
})
