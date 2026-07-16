import express from 'express';
const router = express.Router();
import {getAllDepartments} from '../controllers/departmentController.js'
import {getDepartmentsBySlug} from '../controllers/departmentController.js';

router.get('/', getAllDepartments);
router.get('/:slug', getDepartmentsBySlug);


export default  router;