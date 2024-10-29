import Record from '../models/recordModel.js';
import path from 'path';
import User from '../models/user.js';
import fs from 'fs/promises'; // Use fs/promises for promise-based methods
import { body, validationResult } from 'express-validator';

// Define service charges based on apartment size and number
const serviceCharges = {
  half: 30000,
  single: 60000,
  double: 120000,
  '1.5': 80000,
  duplex: 90000,
  shops: {
    E01A: 47500,
    E02: 47500,
    default: 95000, // Default charge for unspecified shops
  },
};


// Create a new record with validation
export const newRecord_post = [
  // Validation checks
  body('userName').isString().notEmpty().withMessage('Apartment owner is required'),
  body('apartmentNo').isString().notEmpty().withMessage('Apartment number is required'),
  body('apartmentSize').isString().notEmpty().withMessage('Apartment size is required'),

  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    console.log(validationResult)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {  userName, apartmentNo, apartmentSize } = req.body;

    try {
      // Check if a record with the same apartmentNo already exists
      const existingRecord = await Record.findOne({ apartmentNo });

      if (existingRecord) {
        // If a record already exists, return an error response
        return res.status(400).json({ error: 'Record with the same apartment number already exists.' });
      }

      // Determine the service charge amount
      let serviceCharge;
      if (apartmentSize.toLowerCase() in serviceCharges) {
        if (apartmentSize.toLowerCase() === 'shops') {
          // Check the specific shop apartmentNo
          serviceCharge = serviceCharges.shops[apartmentNo] || serviceCharges.shops.default;
        } else {
          serviceCharge = serviceCharges[apartmentSize.toLowerCase()];
        }
      } else {
        return res.status(400).json({ error: 'Invalid apartment size' });
      }

      // Create a new record with the service charge
      const record = await Record.create({
        userName,
        apartmentNo,
        apartmentSize,
        serviceCharge,
      });

      // Update the user with apartment details
      await Record.findOneAndUpdate(
        { userName:  userName }, 
        { $set: { apartmentNo, apartmentSize, serviceCharge } }, // Update fields accordingly
        { new: true } // Return the updated document
      );

      res.status(201).json(record);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
];

// Retrieve all records
export const allRecords_get = async (req, res) => {
  try {
    const records = await Record.find();
    res.status(200).json(records);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
  const { userName, apartmentNo, apartmentSize } = req.body;

  let serviceCharge;
 if (apartmentSize.toLowerCase() in serviceCharges) {
    if (apartmentSize.toLowerCase() === 'shops') {
      // Check the specific shop apartmentNo
      serviceCharge = serviceCharges.shops[apartmentNo] || serviceCharges.shops.default;
    } else {
      serviceCharge = serviceCharges[apartmentSize.toLowerCase()];
    }
  } else {
    return res.status(400).json({ error: 'Invalid apartment size' });
  }

  try {
    const record = await Record.findByIdAndUpdate(id, { userName, apartmentNo, apartmentSize, serviceCharge }, { new: true });
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
  const { id } = req.params;

  try {
    const record = await Record.findByIdAndDelete(id);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    const record = await User.findById(id); // Use the appropriate query to find the record
    console.log('photo  upload',record)
    if (!record) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Set the photoUrl to the path where the photo is stored
    record.photoUrl = `/uploads/${req.file.filename}`;
    await record.save();
    console.log('photo  uploaded', req.user)
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
    const { apartmentSize, serviceCharge } = req.user;
    console.log("Dashboard data:", { apartmentSize, serviceCharge });

    if (!apartmentSize || !serviceCharge) {
      console.log("Apartment details not found");
      return res.status(404).json({ error: 'Apartment details not found.' });
    }

    // Pass the apartment info to the dashboard view
    res.render('dashboard', {
      apartmentSize,
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
