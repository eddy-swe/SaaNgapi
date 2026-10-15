import { Router } from 'express';
import { PublicController, createBookingSchema } from '../controllers/public.controller';
import { validate } from '../middleware/validate';

const router = Router();

// Public booking view routes
router.get('/:username', PublicController.getHostProfile);
router.get('/:username/:eventSlug', PublicController.getEventDetails);
router.get('/:username/:eventSlug/slots', PublicController.getAvailableSlots);
router.post('/:username/:eventSlug/book', validate(createBookingSchema), PublicController.bookAppointment);

// Direct appointment tracking/cancellation for invitees
router.get('/booking/:id', PublicController.getBookingDetails);
router.post('/booking/:id/cancel', PublicController.cancelBooking);

export default router;
