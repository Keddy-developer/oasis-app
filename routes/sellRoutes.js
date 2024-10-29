// sellRoutes.js
import express from 'express';
import * as sellRecordController from '../controllers/sellRecordController.mjs';
import { requireAuth, checkUser } from '../middleware/authMiddleware.mjs';
import multer from 'multer';


const router = express.Router();

const storage = multer.diskStorage( {
    destination: (req, file, cb)=> {
            cb(null, 'public/uploads/')
    },
    filename: (req, file, cb) =>{
            cb(null, `${Date.now()}-${file.originalname}`)
    }
})

const upload = multer({storage: storage})

// User-related routes

router.post('/list', upload.single('apartmentPhotoUrl'), requireAuth, checkUser, sellRecordController.newRecord_post);

// Get all sellRecord (or consider renaming this route for clarity)
router.get('/listings', requireAuth, checkUser, sellRecordController.allRecords_get);

// Route to render the update sellRecord form
router.get('/listings/:id/edit', requireAuth, checkUser, sellRecordController.getUpdateRecord);

// Route to handle sellRecord update
router.patch('/sell/:id', requireAuth, checkUser, sellRecordController.updateRecord_patch);

// Delete a sellRecord
router.delete('/mylistings/:id', requireAuth, checkUser, sellRecordController.deleteRecord_delete);

export default router;
