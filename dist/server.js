"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const env_1 = require("./config/env");
const app_1 = __importDefault(require("./app"));
const auth_socket_1 = require("./shared/middlewares/auth.socket");
const socket_handler_1 = require("./modules/channels/handlers/socket.handler");
const socket_handler_2 = require("./modules/alerts/handlers/socket.handler");
const logger_1 = require("./shared/utils/logger");
const PORT = env_1.env.PORT || 3000;
const httpServer = http_1.default.createServer(app_1.default);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: env_1.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
    maxHttpBufferSize: 1e6,
    pingTimeout: 60000,
});
io.use(auth_socket_1.socketAuthMiddleware);
io.on('connection', (socket) => {
    const authSocket = socket;
    const user = authSocket.user;
    logger_1.Logger.info(`✅ Conectado: ${user?.alias} (ID: ${user?.id})`);
    if (user?.id) {
        socket.broadcast.emit('user-status-changed', {
            userId: user.id,
            isOnline: true,
        });
    }
    (0, socket_handler_1.registerChannelHandlers)(io, authSocket);
    (0, socket_handler_2.registerAlertHandlers)(io, authSocket);
    socket.on('disconnect', (reason) => {
        logger_1.Logger.info(`❌ Desconectado: ${user?.alias} (Razón: ${reason})`);
        if (user?.id) {
            socket.broadcast.emit('user-status-changed', {
                userId: user.id,
                isOnline: false,
            });
        }
    });
});
io.engine.on('connection_error', (err) => {
    const req = err.req;
    logger_1.Logger.warn(`🔒 Conexión rechazada: ${err.message} - IP: ${req?.socket?.remoteAddress}`);
});
httpServer.listen(PORT, () => {
    logger_1.Logger.info(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    logger_1.Logger.info(`🔌 Sistema de Walkie Talkie & Alertas ACTIVO`);
});
