"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const prisma_1 = require("../infra/prisma");
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Acceso denegado. ¡No trae credenciales, mi compa!',
            });
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, jwt_1.verifyToken)(token);
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
            return res.status(401).json({
                error: 'Usuario no encontrado. Este compa ya no está en el batallón.',
            });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({
            error: 'Token inválido o expirado. ¡Ese acceso ya no sirve!',
        });
    }
};
exports.authMiddleware = authMiddleware;
