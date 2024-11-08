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
import Record from './models/recordModel.js';
import dotenv from 'dotenv';
import session from 'express-session';
import User from './models/user.js';

dotenv.config();

const app = express();


app.use(session({
    secret: 'your secret', // Change this to a strong secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true } 
}));


app.use(cors({
    origin: '*', // or specify Safaricom's domains
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization'
}));
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
.then(() => app.listen(process.env.PORT || 3020, () => {
    console.log(`Server is running on port ${process.env.PORT || 3020}`);
}))
  .catch((err) => console.log(err));

// routes
app.get('*', checkUser);
app.get('/', (req, res) => res.render('home'));
app.get('/dashboard', requireAuth, async (req, res) => {
    let { year, apartmentNo } = req.query;

    // Convert year to a number and check if it's valid
    year = Number(year);
    const currentYear = new Date().getFullYear();

    // If year is not a valid number, default to the current year
    if (isNaN(year) || year < 2023) {
        year = currentYear; // Use the current year as default
    }

    try {
        let apartments;

        // Check if `apartmentNo` is provided
        if (apartmentNo) {
            // If year is provided, fetch specific apartment record by year and apartment number
            if (year) {
                apartments = await Record.find({
                    'paymentModel.year': year,
                    apartmentNo: apartmentNo
                });
            } else {
                // If year is not provided, fetch all records for the specific apartment number
                apartments = await Record.find({
                    apartmentNo: apartmentNo
                });
            }
        } else {
            // If `year` is defined, fetch all apartments for that year
            // Otherwise, fetch all apartments if neither is defined
            apartments = await Record.find({
                ...(year ? { 'paymentModel.year': year } : {})
            });
        }

        // Calculate totals
        const totalServiceCharge = apartments.reduce((sum, apt) => sum + (Number(apt.serviceCharge) || 0), 0);
        const totalAmountCollected = apartments.reduce((sum, apt) => {
            const collected = apt.paymentModel.reduce((innerSum, payment) => innerSum + (Number(payment.amountCollected) || 0), 0);
            return sum + collected;
        }, 0);
        const totalAmountOwed = totalServiceCharge - totalAmountCollected;

        console.log("Total Service Charge:", totalServiceCharge);
        console.log("Total Amount Collected:", totalAmountCollected);
        console.log("Total Amount Owed:", totalAmountOwed);

        // Check the role of the current user
        const isAdmin = req.user.role === 'admin';
        const currentUserApartmentNo = req.user.apartmentNo;

        const selectedYear = req.query.year || currentYear; // Get the selected year from query params, default to current year

        // Initialize variables for apartment size and service charge
        let userApartmentSize = 'N/A'; // Default value if no records found
        let userServiceCharge = 'N/A'; // Default value if no records found
        let userBal = 'N/A'; // Default value if no records found
        let owner = 'N/A'; // Default value if no records found
        let currentUserPayments = [];

        // If the user is an apartment owner, fetch their payments
        if (!isAdmin) {
            // Fetch payments for the current user's apartment number and selected year
            currentUserPayments = await Record.find({ 
                apartmentNo: currentUserApartmentNo, 
                'paymentModel.year': selectedYear // Filter by the selected year
            });

            // Check if any payments exist
            if (currentUserPayments.length > 0) {
                // Assuming you're interested in the first payment record
                userApartmentSize = currentUserPayments[0].apartmentSize; // Access the first element
                userServiceCharge = currentUserPayments[0].serviceCharge; // Access the first element
                owner = currentUserPayments[0].apartmentOwner; // Access the first element
                
                const findUserBal = currentUserPayments[0].paymentModel.find(payment => payment.year === Number(selectedYear));
                if(!findUserBal){
                    userBal = 'N/A';
                }else {
                   userBal = findUserBal.amountOwed
                }
                
                // Log the apartment size and service charge
                console.log('This user:', userApartmentSize, userServiceCharge);
            } else {
                console.log('No payments found for this user.');
            }
        }

        // For admins, allow empty apartment records without displaying "user not found"
        if (isAdmin) {
            console.log("Admin access granted.");
            res.render('dashboard', { 
                currentRoute: req.path, // for admin dashboard
                apartments, // for admin dashboard
                year: selectedYear, // Pass the selected year to the view // for admin dashboard
                totalAmountCollected, // for admin dashboard
                totalAmountOwed, // for admin dashboard
            })
        } else {
            const userRecord = await Record.findOne({ apartmentNo: currentUserApartmentNo });

            if (!userRecord) {
                console.log("No record found for this user.");
            }

            // Filter and sort the transactions directly from the array
            const transactions = userRecord ? userRecord.transactionsModel
              .filter(transaction => transaction.user.toString() === req.user._id.toString())
              .sort((a, b) => b.transactionDate - a.transactionDate) : [];

            // Render the dashboard view with all the data
            res.render('dashboard', { 
                currentRoute: req.path, // for admin dashboard
                apartments, // for admin dashboard
                year: selectedYear, // Pass the selected year to the view // for admin dashboard
                totalAmountCollected, // for admin dashboard
                totalAmountOwed, // for admin dashboard and 
                userApartmentSize, // user dashboard
                userServiceCharge, // user dashboard
                userBal,
                owner,
                transactions // user dashboard
            });
        }

    } catch (error) {
        console.error("Error fetching apartments:", error);
        res.status(500).send("Server error");
    }
});
// Fetch apartments in the sellandbuy route
app.get('/listings', requireAuth, async (req, res) => {
    try {
        const apartments = await SellRecord.find({}).sort({createdAt: -1}); // Fetch all sell records
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
      const apartments = await SellRecord.find({ userName: userName }).sort({createdAt: -1}); // Fetch all sell records for the user
       // Log the apartments to the console
      res.render('mylistings', { apartments, currentRoute: req.path }); // Render the view with apartments
  } catch (error) {
      console.error("Error fetching apartments:", error);
      res.status(500).send("Server error");
  }
});

app.get('/list', requireAuth, (req, res) => res.render('sell', { currentRoute: req.path }));
app.get('/api/stkpush', requireAuth, (req, res) => res.render('makepayment', { currentRoute: req.path }));
app.get('/records', requireAuth, (req, res) => res.render('profile', { currentRoute: req.path }));
app.get('/profile', requireAuth, (req, res) => res.render('profile', { currentRoute: req.path }));
app.get('/updatePassword', requireAuth, (req, res) => res.render('settings', { currentRoute: req.path }));
app.get('/forgotPassword', (req, res) => res.render('forgot-password'));
app.get('/resetPassword/:token', (req, res) => res.render('reset-password', { currentRoute: req.path }));
app.get('/update/profile/:id', requireAuth, async (req, res) => {
    const id = req.user._id
    console.log('edit records',id)
    try {
        const user = await User.find({_id: id})
        console.log(user)
        res.render('updateProfile', {user, currentRoute: req.path })
    } catch (error) {
        console.error("Error fetching records:", error);
        res.status(500).send("Server error");
    }

});
app.get('/records/:id', requireAuth, (req, res) => res.render('profile', { currentRoute: req.path }));
app.get('/upload-photo', requireAuth, (req, res) => res.render('profile', { currentRoute: req.path }));
app.get('/delete-photo', requireAuth, (req, res) => res.render('profile', { currentRoute: req.path }));

app.use(authRoutes);
app.use(recordRoutes);
app.use(sellRecordRoutes);
app.use(apiRoutes);


