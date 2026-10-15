import { Router } from 'express';
import {
  EventTypeController,
  createEventTypeSchema,
  updateEventTypeSchema
} from '../controllers/eventType.controller';
import { authenticate, requireHost } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Protect all event type management routes with host auth
router.use(authenticate, requireHost);

router.get('/', EventTypeController.list);
router.post('/', validate(createEventTypeSchema), EventTypeController.create);
router.get('/:id', EventTypeController.getById);
router.put('/:id', validate(updateEventTypeSchema), EventTypeController.update);
router.delete('/:id', EventTypeController.delete);

export default router;
