import e from "express";
import { getAllDoctors, getAwardsByDoctorId, getCertificationsByDoctorId, getDoctorById, getEducationByDoctorId, getMembershipsByDoctorId, getScheduleById } from "../controllers/doctorsConrollers.js";
const router = e.Router()

router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/education', getEducationByDoctorId);
router.get('/:id/certifications', getCertificationsByDoctorId);
router.get('/:id/awards', getAwardsByDoctorId);
router.get('/:id/memberships', getMembershipsByDoctorId);
router.get('/:id/schedule', getScheduleById);

export default router