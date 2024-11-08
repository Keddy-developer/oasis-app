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


// Middleware to check if the user is an admin
function isAdmin(req, res, next) {
    console.log(req.session.use)
    if (req.session.user && req.session.user.role === 'admin') {
        
      next();
    } else {
      res.status(403).send('Access denied');
    }
  }

// User-related routes

router.post('/records', requireAuth, checkUser, recordController.newRecord_post);

// Get all records (or consider renaming this route for clarity)
router.get('/dashboard', requireAuth, checkUser, recordController.allRecords_get);


// Delete a record
router.delete('/records/:id', requireAuth, checkUser, recordController.deleteRecord_delete);

// Photo upload and delete routes
router.post('/upload-photo', upload.single('profilePhoto'), requireAuth, checkUser, recordController.UploadPhoto_post);
router.delete('/delete-photo', recordController.deletePhoto);

// Dashboard route
router.get('/dashboard', requireAuth, checkUser, recordController.dashboard_get);

// Profile route (consider changing the path for clarity)
router.get('/profile', requireAuth, checkUser, recordController.profile_get);

// POST Add Apartment
router.post('/admin/add-apartment', requireAuth, checkUser, isAdmin, recordController.addApartment_post);

router.get('/admin/get-apartment/:id',isAdmin, requireAuth, checkUser, recordController.getApartments_get);
  
  // PUT Edit Apartment
  router.put('/admin/edit-apartment/:id', isAdmin, requireAuth, checkUser, recordController.editApartment_put );
  
  // DELETE Remove Apartment
  router.delete('/admin/remove-apartment/:id', isAdmin, requireAuth, checkUser, recordController.removeApartment_delete);

export default router;
