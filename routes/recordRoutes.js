// recordRoutes.js
import express from 'express';
import * as recordController from '../controllers/recordController.mjs';
import multer from 'multer';
import { requireAuth, checkUser } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// Configure Multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Save uploaded files in 'public/uploads/' directory
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Rename the file with a timestamp to avoid name collisions
    }
});

const upload = multer({ storage: storage });

// User-related routes

router.post('/records', requireAuth, checkUser, recordController.newRecord_post);
router.post('/signup', requireAuth, checkUser, recordController.newRecord_post);

// Get all records (or consider renaming this route for clarity)
router.get('/records', requireAuth, checkUser, recordController.allRecords_get);

// Route to render the update record form
router.get('/records/:id/edit', requireAuth, checkUser, recordController.getUpdateRecord, );

// Route to handle record update
router.patch('/records/:id', requireAuth, checkUser, recordController.updateRecord_patch);

// Delete a record
router.delete('/records/:id', requireAuth, checkUser, recordController.deleteRecord_delete);

// Photo upload and delete routes
router.post('/upload-photo', upload.single('profilePhoto'), requireAuth, checkUser, recordController.UploadPhoto_post);
router.delete('/delete-photo', recordController.deletePhoto);

// Dashboard route
router.get('/dashboard', requireAuth, checkUser, recordController.dashboard_get);

// Profile route (consider changing the path for clarity)
router.get('/profile', requireAuth, checkUser, recordController.profile_get);

export default router;
