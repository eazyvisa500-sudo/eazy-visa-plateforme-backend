import { Router } from 'express'
import { loginSuperAdmin, loginUser } from '../controllers/auth.controller'

const router = Router()

router.post('/login/superadmin', loginSuperAdmin)
router.post('/login', loginUser)

export default router
