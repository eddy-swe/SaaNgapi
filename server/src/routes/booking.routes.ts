import { Router } from 'express';
import {
  BookingController,
  cancelBookingSchema,
  rescheduleBookingSchema
} from '../controllers/booking.controller';
import { authenticate, requireHost } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate, requireHost);

router.get('/', BookingController.list);
router.get('/:id', BookingController.getById);
router.post('/:id/cancel', validate(cancelBookingSchema), BookingController.cancel);
router.post('/:id/reschedule', validate(rescheduleBookingSchema), BookingController.reschedule);

export default router;
