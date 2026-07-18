import { Router } from 'express';
import { bookAppointment, searchMyAppointments } from '../controllers/AppointmentsController.js';
const router = Router();

// IMPORTANT: /search must come BEFORE any /:id route to avoid being
// captured as an id param (not used here, but good practice if you add one later)

// GET /api/appointments/search?email=...&phone=...
router.get('/search', searchMyAppointments);

// POST /api/appointments
router.post('/', bookAppointment);

export default router;
