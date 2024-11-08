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
  body('apartmentOwner').isString().notEmpty().withMessage('Apartment owner is required'),
  body('apartmentNo').isString().notEmpty().withMessage('Apartment number is required'),
  body('apartmentSize').isString().notEmpty().withMessage('Apartment size is required'),

  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    console.log(validationResult)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {  apartmentOwner, apartmentNo, apartmentSize } = req.body;

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
        apartmentOwner,
        apartmentNo,
        apartmentSize,
        serviceCharge,
      });

      // Update the user with apartment details
      await Record.findOneAndUpdate(
        { apartmentNo:  apartmentNo }, 
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
    const apartments = await Record.find();
    // const totalAmountCollected = apartments.reduce((sum, apt) => sum + apt.amountCollected, 0);
    const totalAmountCollected = 30000;
    //const totalAmountOwed = apartments.reduce((sum, apt) => sum + apt.amountOwed, 0);
    const totalAmountOwed = 20000
    res.render('dashboard', {
      user: req.session.user,
      apartments,
      totalAmountCollected,
      totalAmountOwed
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
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
  const { apartmentOwner, apartmentNo} = req.body;

  try {
    const findApartmentNo = Record.find({apartmentNo})
    console.log('apartmentno', findApartmentNo)
    if (findApartmentNo) {
      const record = await Record.findByIdAndUpdate(id, { apartmentOwner, apartmentNo }, { new: true });
      if (!record) {
        return res.status(404).json({ error: 'Record not found' });
      }
      res.status(200).json(record);
    } else {
      return res.status(404).json({ error: 'Record not found' });
    }
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

export const addApartment_post = async (req, res) => {
  try {
    const { apartmentNo, apartmentOwner, apartmentSize } = req.body;

    // Check if an apartment with the same number already exists
    const existingApartment = await Record.findOne({ apartmentNo });

    if (existingApartment) {
      return res.status(400).json({ message: 'Apartment already exists!' }); // Use 400 for client error
    } else {

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
      // Create a new apartment record
      const year = new Date().getFullYear();
      const amountCollected = 0
      const amountOwed = serviceCharge
      const newApartment = await Record.create({
        apartmentNo,
        apartmentOwner,
        apartmentSize,
        serviceCharge,
        paymentModel: [{
            year: year, // Set the year to the current year
            amountCollected: amountCollected, // Set initial amount collected
            amountOwed: amountOwed // Set amount owed to service charge
        }]
      });

      return res.status(201).json({ message: 'Apartment added successfully', apartment: newApartment });
    }
    
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to add apartment' });
  }
}

export const editApartment_put = async (req, res) => {
  try {
    const { id } = req.params;
    const { apartmentNo, apartmentOwner, apartmentSize, amountCollected } = req.body;

    // Fetch the record by ID
    const record = await Record.findById(id);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Determine serviceCharge based on apartmentSize
    let serviceCharge;
    if (apartmentSize.toLowerCase() in serviceCharges) {
      if (apartmentSize.toLowerCase() === 'shops') {
        serviceCharge = serviceCharges.shops[apartmentNo] || serviceCharges.shops.default;
      } else {
        serviceCharge = serviceCharges[apartmentSize.toLowerCase()];
      }
    } else {
      return res.status(400).json({ error: 'Invalid apartment size' });
    }

    // Update basic fields
    record.apartmentNo = apartmentNo;
    record.apartmentOwner = apartmentOwner;
    record.apartmentSize = apartmentSize;
    record.serviceCharge = serviceCharge;

    // Parse the year and amount collected
    const year = Number(req.body.yearSelector);
    const amountCollectedNum = Number(amountCollected);
    console.log('Mwaka',year)

    // Find or create the payment entry for the specified year
    let paymentEntry = record.paymentModel.find(entry => entry.year === year);
    
    if (paymentEntry) {
      // Update existing payment entry
      paymentEntry.amountCollected += amountCollectedNum;
      const amountOwed = (Number(serviceCharge) - paymentEntry.amountCollected) > Number(serviceCharge)
      ? Number(serviceCharge)
      : Number(serviceCharge) - paymentEntry.amountCollected
      // Recalculate amount owed
      paymentEntry.amountOwed = amountOwed;
    } else {
      // Calculate amount owed for new entry
      const amountOwed = (Number(serviceCharge) - amountCollectedNum) > Number(serviceCharge)
        ? Number(serviceCharge)
        : Number(serviceCharge) - amountCollectedNum;

      // Add a new entry if it doesn't exist
      record.paymentModel.push({
        year: year,
        amountCollected: amountCollectedNum,
        amountOwed: amountOwed,
      });
    }

    // Save the updated record
    await record.save();
    res.status(200).json({ message: 'Apartment updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update apartment' });
  }
};

export const getApartments_get = async (req, res) => {
  try {
      const apartment = await Record.findById(req.params.id);
      if (!apartment) {
          return res.status(404).send({ error: 'Apartment not found' });
      }
      res.json(apartment);
  } catch (error) {
      res.status(500).send({ error: 'Server error' });
  }
}

export const removeApartment_delete = async (req, res) => {
  try {
      const { id } = req.params; // Get apartment ID from request parameters
      const { year } = req.query; // Get the year from the query parameters

      // Validate the year input
      const formatedYear = Number(year);
      if (isNaN(formatedYear)) {
          return res.status(400).json({ error: 'Invalid year provided' });
      }

      // Find the apartment by ID and delete the payment model for the specific year
      const result = await Record.findOneAndUpdate(
          { _id: id, 'paymentModel.year': formatedYear },
          { $pull: { paymentModel: { year: formatedYear } } }, // Remove the payment model for the specified year
          { new: true } // Return the updated document
      );

      // Check if the record was found and modified
      if (!result) {
          return res.status(404).json({ error: 'Apartment not found or no payment record for this year' });
      }

      res.status(200).json({ message: 'Payment record for the year removed successfully', result });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to remove apartment payment record' });
  }
}