import { Router } from 'express';
import * as authController from '../controllers/authController.mjs'; // Ensure the file extension is included
import { requireAuth, checkUser } from '../middleware/authMiddleware.mjs';
import multer from 'multer';

const router = Router();

const storage = multer.diskStorage( {
    destination: (req, file, cb)=> {
            cb(null, 'public/uploads/')
    },
    filename: (req, file, cb) =>{
            cb(null, `${Date.now()}-${file.originalname}`)
    }
})

const upload = multer({storage: storage})
router.get('/signup', authController.signup_get);
router.post('/signup', authController.signup_post);
router.get('/login', authController.login_get);
router.post('/login', authController.login_post);
router.get('/logout', authController.logout_get);
router.patch('/updatePassword',authController.update_post)
router.get('/update/profile', requireAuth, checkUser, authController.getUpdateProfile, );
router.patch('/update/profile/:id',upload.single('photoUrl'), authController.updateProfile_patch)
router.post('/delete', authController.delete_post);
router.post('/forgotPassword', authController.forgot_post);
router.patch('/resetPassword/:token', authController.resetPassword);

export default router;
