"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyHistory = exports.getActiveAlerts = void 0;
const alerts_service_1 = require("./alerts.service");
const alertsService = new alerts_service_1.AlertsService();
const getActiveAlerts = async (req, res) => {
    try {
        const channelId = req.params.channelId;
        const alerts = await alertsService.getActiveAlertsByChannel(channelId);
        res.status(200).json(alerts);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al buscar alertas activas: ' + error.message });
    }
};
exports.getActiveAlerts = getActiveAlerts;
const getMyHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const history = await alertsService.getMyAlertHistory(userId);
        res.status(200).json(history);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener tu historial: ' + error.message });
    }
};
exports.getMyHistory = getMyHistory;
