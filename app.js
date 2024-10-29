import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import methodOverride from 'method-override';
import authRoutes from './routes/authRoutes.js';
import cookieParser from 'cookie-parser';
import { requireAuth, checkUser } from './middleware/authMiddleware.mjs';
import recordRoutes from './routes/recordRoutes.js';
import sellRecordRoutes from './routes/sellRoutes.js';
import apiRoutes from './routes/apiRoutes.js'
import SellRecord from './models/sellRecordModel.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();


app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); // For parsing form data
app.use(methodOverride('_method')); // This will enable method override for forms
app.use((req, res, next) => {
    console.log(`Method: ${req.method}, Path: ${req.path}`);
    next();
});
app.use(cookieParser());
app.set('view engine', 'ejs');

const dbURI = process.env.MONGODB_URI;
mongoose.connect(dbURI)
  .then(() => app.listen(3020))
  .catch((err) => console.log(err));

// routes
app.get('*', checkUser);
app.get('/', (req, res) => res.render('home'));
app.get('/dashboard', requireAuth, (req, res) => res.render('dashboard', { currentRoute: req.path }));

// Fetch apartments in the sellandbuy route
app.get('/listings', requireAuth, async (req, res) => {
    try {
        const apartments = await SellRecord.find(); // Fetch all sell records
        res.render('sellandbuy', { apartments, currentRoute: req.path }); // Render the view with apartments
    } catch (error) {
        console.error("Error fetching apartments:", error);
        res.status(500).send("Server error");
    }
});
app.get('/mylistings', requireAuth, async (req, res) => {
  const userName = req.user.userName; // Get the user ID from the request
  console.log(userName);
  try {
      const apartments = await SellRecord.find({ userName: userName }); // Fetch all sell records for the user
       // Log the apartments to the console
      res.render('mylistings', { apartments, currentRoute: req.path }); // Render the view with apartments
  } catch (error) {
      console.error("Error fetching apartments:", error);
      res.status(500).send("Server error");
  }
});

app.get('/list', requireAuth, (req, res) => res.render('sell', { currentRoute: req.path }));
app.get('/makepayment', requireAuth, (req, res) => res.render('makepayment', { currentRoute: req.path }));
app.get('/records', requireAuth, (req, res) => res.render('profile', { currentRoute: req.path }));
app.get('/profile', requireAuth, (req, res) => res.render('profile', { currentRoute: req.path }));
app.get('/updatePassword', requireAuth, (req, res) => res.render('settings', { currentRoute: req.path }));
app.get('/forgotPassword', (req, res) => res.render('forgot-password'));
app.get('/resetPassword/:token', (req, res) => res.render('reset-password', { currentRoute: req.path }));
app.get('/records/:id/edit', requireAuth, (req, res) => res.render('profile', { currentRoute: req.path }));
app.get('/records/:id', requireAuth, (req, res) => res.render('profile', { currentRoute: req.path }));
app.get('/upload-photo', requireAuth, (req, res) => res.render('profile', { currentRoute: req.path }));
app.get('/delete-photo', requireAuth, (req, res) => res.render('profile', { currentRoute: req.path }));

app.use(authRoutes);
app.use(recordRoutes);
app.use(sellRecordRoutes);
app.use(apiRoutes);
