"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const prisma_1 = require("../../shared/infra/prisma");
const password_1 = require("../../shared/utils/password");
const jwt_1 = require("../../shared/utils/jwt");
class AuthService {
    async register(data) {
        const existingUser = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [{ email: data.email }, { alias: data.alias }],
            },
        });
        if (existingUser) {
            if (existingUser.email === data.email)
                throw new Error('El email ya está registrado');
            if (existingUser.alias === data.alias)
                throw new Error('El alias ya está en uso');
        }
        const hashedPassword = await (0, password_1.hashPassword)(data.password);
        const newUser = await prisma_1.prisma.user.create({
            data: {
                email: data.email,
                alias: data.alias,
                firstName: data.firstName,
                lastName: data.lastName,
                password: hashedPassword,
                avatarUrl: data.avatarUrl,
            },
        });
        const token = (0, jwt_1.generateToken)(newUser.id, newUser.alias);
        return {
            user: {
                id: newUser.id,
                email: newUser.email,
                alias: newUser.alias,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                avatarUrl: newUser.avatarUrl,
            },
            token,
        };
    }
    async login(data) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (!user)
            throw new Error('Credenciales inválidas');
        const isValid = await (0, password_1.comparePassword)(data.password, user.password);
        if (!isValid)
            throw new Error('Credenciales inválidas');
        const token = (0, jwt_1.generateToken)(user.id, user.alias);
        return {
            user: {
                id: user.id,
                email: user.email,
                alias: user.alias,
                firstName: user.firstName,
                lastName: user.lastName,
                avatarUrl: user.avatarUrl,
            },
            token,
        };
    }
    async checkAvailability(email, alias) {
        const conditions = [];
        if (email)
            conditions.push({ email });
        if (alias)
            conditions.push({ alias });
        const user = await prisma_1.prisma.user.findFirst({
            where: { OR: conditions },
        });
        return user === null;
    }
}
exports.AuthService = AuthService;
