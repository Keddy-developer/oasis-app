// sellRoutes.js
import express from 'express';
import * as apiControllers from '../controllers/apiControllers.mjs';
import { requireAuth, checkUser } from '../middleware/authMiddleware.mjs';



const router = express.Router();


// User-related routes

router.post('/makepayment', requireAuth, checkUser, apiControllers.stkpush_post);



export default router;
