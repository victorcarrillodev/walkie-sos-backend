"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketAuthMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const prisma_1 = require("../infra/prisma");
const socketAuthMiddleware = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        if (!token) {
            return next(new Error('Autenticación requerida. ¡Identifíquese, mi compa!'));
        }
        const cleanToken = token.replace('Bearer ', '');
        const decoded = (0, jwt_1.verifyToken)(cleanToken);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                alias: true,
                email: true,
                firstName: true,
            },
        });
        if (!user) {
            return next(new Error('Usuario no encontrado en la base de datos.'));
        }
        ;
        socket.user = user;
        next();
    }
    catch (error) {
        next(new Error('Token inválido o expirado. ¡Ese acceso ya no sirve!'));
    }
};
exports.socketAuthMiddleware = socketAuthMiddleware;
