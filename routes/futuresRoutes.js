import express from 'express'
const router = express.Router()
import getAllFuture from '../controllers/futureController.js'

router.get('/', getAllFuture)

export default router