// sellRoutes.js
import express from 'express';
import * as apiControllers from '../controllers/apiControllers.mjs';
import { requireAuth, checkUser } from '../middleware/authMiddleware.mjs';



const router = express.Router();


// User-related routes

router.post('/api/stkpush', requireAuth, checkUser, apiControllers.stkpush_post);
router.post('/api/callback', apiControllers.apiCallback_post);




export default router;
