import SellRecord from '../models/sellRecordModel.js';
import path from 'path';
import User from '../models/user.js';
import fs from 'fs/promises'; // Use fs/promises for promise-based methods
import { body, validationResult } from 'express-validator';


// Create a new record with validation
export const newRecord_post = [
  // Validation checks
  body('sellApartmentSize').isString().notEmpty().withMessage('Apartment size is required'),
  body('price').isString().notEmpty().withMessage('Price is required'),
  body('description').isString().notEmpty().withMessage('Description is required'),
  body('phone').isString().notEmpty().withMessage('Phone number is required'),

  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    console.log(validationResult)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {  apartmentPhotoUrl, sellApartmentSize, bedroomsNo, squareFootage, price, description, phone,} = req.body;
    const user = req.user
    
    try {

console.log({   apartmentPhotoUrl: `/uploads/${req.file.filename}`,
  sellApartmentSize,
  bedroomsNo,
  squareFootage,
  price, 
  description, 
  phone, 
  userName: user.userName})
      // Create a new record with the service charge
      const record = await SellRecord.create({
        apartmentPhotoUrl: `/uploads/${req.file.filename}`,
        sellApartmentSize,
        bedroomsNo,
        squareFootage,
        price, 
        description, 
        phone, 
        userName: user.userName
      });

      res.status(201).json(record);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
];

// Retrieve all records
export const allRecords_get = async (req, res) => {
  try {
      const apartments = await SellRecord.find({}).sort({ createdAt: -1}); // Fetch all sell records
      res.render('sellandbuy', { apartments, currentRoute: req.path }); // Render the view with apartments
  } catch (error) {
      console.error("Error fetching apartments:", error);
      res.status(500).send("Server error");
    }
};

// Get record details to render the update form
export const getUpdateRecord = async (req, res) => {
  const { id } = req.params;
  try {
    const record = await Record.findById(id);
    if (!record) {
      res.status(404).json(alert('Please create a profile.'));
      res.redirect('/profile')
    }

    res.render('updateProfile', { record });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update a record 
export const updateRecord_patch = async (req, res) => {
  const { id } = req.params;
  const { userName, apartmentNo, sellApartmentSize } = req.body;

  let serviceCharge;
 if (sellApartmentSize.toLowerCase() in serviceCharges) {
    if (sellApartmentSize.toLowerCase() === 'shops') {
      // Check the specific shop apartmentNo
      serviceCharge = serviceCharges.shops[apartmentNo] || serviceCharges.shops.default;
    } else {
      serviceCharge = serviceCharges[sellApartmentSize.toLowerCase()];
    }
  } else {
    return res.status(400).json({ error: 'Invalid apartment size' });
  }

  try {
    const record = await Record.findByIdAndUpdate(id, { userName, apartmentNo, sellApartmentSize, serviceCharge }, { new: true });
    if (!record) {
      return res.status(404).json({ error: 'Record not found2' });
    }
    res.status(200).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a record
export const deleteRecord_delete = async (req, res) => {
  console.log('Delete request received for ID:', req.params.id);
  const { id } = req.params; // Get the ID from the request parameters
  try {
      const result = await SellRecord.findByIdAndDelete(id); // Delete the listing by ID
      if (!result) {
          return res.status(404).send("Listing not found");
      }
      console.log("Deleted successfully");
      res.redirect('/mylistings');
  } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).send("Server error");
  }
};

// Upload a photo
export const UploadPhoto_post = async (req, res) => {
  // Assuming user ID is stored in req.user from authentication middleware
  const { id } = req.user; // Ensure that you have user ID from the request context

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Find the record using user ID or any other identifier
    const record = await Record.findById(id); // Use the appropriate query to find the record
    console.log(record)
    if (!record) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Set the photoUrl to the path where the photo is stored
    record.photoUrl = `/uploads/${req.file.filename}`;
    await record.save();

    res.status(200).json({ message: 'Photo uploaded successfully', photoUrl: record.photoUrl });
  } catch (err) {
    console.error("Error uploading photo:", err.message); // Log error details
    res.status(400).json({ error: err.message });
  }
};

// Delete a photo
export const deletePhoto = async (req, res) => {
  const {  userName, apartmentNo } = req.body;

  try {
    const record = await Record.findOne({  userName, apartmentNo });
    if (!record) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (record.photoUrl) {
      const filePath = path.join(process.cwd(), 'public', 'uploads', record.photoUrl.split('/').pop());
      await fs.unlink(filePath);
    }

    record.photoUrl = '';
    await record.save();

    res.status(200).json({ message: 'Photo deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Route to render the dashboard with apartment info
export const dashboard_get = async (req, res) => {
  try {
    // Extract apartment details from req.user
    const { sellApartmentSize, serviceCharge } = req.user;
    console.log("Dashboard data:", { sellApartmentSize, serviceCharge });

    if (!sellApartmentSize || !serviceCharge) {
      console.log("Apartment details not found");
      return res.status(404).json({ error: 'Apartment details not found.' });
    }

    // Pass the apartment info to the dashboard view
    res.render('dashboard', {
      sellApartmentSize,
      serviceCharge
    });
  } catch (err) {
    console.log("Error rendering dashboard:", err.message);
    res.status(500).json({ error: err.message });
  }
};
export const profile_get = async (req, res) => {
  try {
    // Ensure req.user exists before destructuring
    if (!req.user) {
      return res.status(404).json({ error: 'User details not found.' });
    }

    const { photoUrl } = req.user;
    console.log("Profile data:", { photoUrl });

    // You can still render the dashboard even if photoUrl is missing
    res.render('profile', {
      photoUrl: photoUrl || '/profile.jfif' // Set a default profile picture if photoUrl is missing
    });
  } catch (err) {
    console.log("Error rendering photoURL:", err.message);
    res.status(500).json({ error: err.message });
  }
};
