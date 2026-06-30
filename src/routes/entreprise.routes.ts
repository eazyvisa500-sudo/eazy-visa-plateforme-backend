import { Router } from 'express'
import multer from 'multer'
import {
  createEntreprise,
  getAllEntreprises,
  getEntrepriseById,
  updateEntreprise,
  toggleEntrepriseStatut,
} from '../controllers/entreprise.controller'
import { uploadLogoEntreprise, getLogoEntreprise } from '../controllers/logo.controller'
import { requireAuth, requireSuperAdmin } from '../middlewares/auth.middleware'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Seules les images sont acceptées'))
    }
  },
})

const router = Router()

router.use(requireAuth, requireSuperAdmin)

router.post('/', createEntreprise)
router.get('/', getAllEntreprises)
router.get('/:id', getEntrepriseById)
router.put('/:id', updateEntreprise)
router.patch('/:id/statut', toggleEntrepriseStatut)
router.get('/:id/logo', getLogoEntreprise)
router.patch('/:id/logo', upload.single('logo'), uploadLogoEntreprise)

export default router
