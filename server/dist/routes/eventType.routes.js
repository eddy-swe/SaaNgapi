"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eventType_controller_1 = require("../controllers/eventType.controller");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
// Protect all event type management routes with host auth
router.use(auth_1.authenticate, auth_1.requireHost);
router.get('/', eventType_controller_1.EventTypeController.list);
router.post('/', (0, validate_1.validate)(eventType_controller_1.createEventTypeSchema), eventType_controller_1.EventTypeController.create);
router.get('/:id', eventType_controller_1.EventTypeController.getById);
router.put('/:id', (0, validate_1.validate)(eventType_controller_1.updateEventTypeSchema), eventType_controller_1.EventTypeController.update);
router.delete('/:id', eventType_controller_1.EventTypeController.delete);
exports.default = router;
