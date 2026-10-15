"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const public_controller_1 = require("../controllers/public.controller");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
// Public booking view routes
router.get('/:username', public_controller_1.PublicController.getHostProfile);
router.get('/:username/:eventSlug', public_controller_1.PublicController.getEventDetails);
router.get('/:username/:eventSlug/slots', public_controller_1.PublicController.getAvailableSlots);
router.post('/:username/:eventSlug/book', (0, validate_1.validate)(public_controller_1.createBookingSchema), public_controller_1.PublicController.bookAppointment);
// Direct appointment tracking/cancellation for invitees
router.get('/booking/:id', public_controller_1.PublicController.getBookingDetails);
router.post('/booking/:id/cancel', public_controller_1.PublicController.cancelBooking);
exports.default = router;
