import { Router } from 'express';
import { PublicController, createBookingSchema } from '../controllers/public.controller';
import { validate } from '../middleware/validate';

const router = Router();

// Direct appointment tracking/cancellation for invitees.
// These must be registered BEFORE the /:username routes, otherwise
// GET /booking/:id is captured by /:username/:eventSlug.
router.get('/booking/:id', PublicController.getBookingDetails);
router.post('/booking/:id/cancel', PublicController.cancelBooking);

// Public booking view routes
router.get('/:username', PublicController.getHostProfile);
router.get('/:username/:eventSlug', PublicController.getEventDetails);
router.get('/:username/:eventSlug/slots', PublicController.getAvailableSlots);
router.post('/:username/:eventSlug/book', validate(createBookingSchema), PublicController.bookAppointment);

export default router;
