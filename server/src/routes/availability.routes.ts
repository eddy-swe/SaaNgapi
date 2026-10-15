import { Router } from 'express';
import {
  AvailabilityController,
  updateScheduleSchema,
  createOverrideSchema
} from '../controllers/availability.controller';
import { authenticate, requireHost } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate, requireHost);

router.get('/', AvailabilityController.getAvailability);
router.put('/', validate(updateScheduleSchema), AvailabilityController.updateSchedule);
router.post('/override', validate(createOverrideSchema), AvailabilityController.addOverride);
router.delete('/override/:id', AvailabilityController.deleteOverride);

export default router;
