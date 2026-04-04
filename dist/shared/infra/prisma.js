"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const env_1 = require("../../config/env");
const globalForPrisma = globalThis;
const prismaClientSingleton = () => {
    const connectionString = env_1.env.DATABASE_URL;
    const pool = new pg_1.Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
    });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    return new client_1.PrismaClient({
        adapter,
        log: ['query', 'info', 'warn', 'error'],
    });
};
exports.prisma = globalForPrisma.prisma ?? prismaClientSingleton();
if (env_1.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
