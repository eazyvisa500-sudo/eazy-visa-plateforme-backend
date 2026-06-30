import { Router } from 'express'
import { loginSuperAdmin, loginUser } from '../controllers/auth.controller'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router()

router.post('/login/superadmin', asyncHandler(loginSuperAdmin))
router.post('/login', asyncHandler(loginUser))

export default router
