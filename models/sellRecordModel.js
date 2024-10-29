import mongoose from 'mongoose';
import pkg from 'validator';

const { isEmail } = pkg;

const sellRecordSchema = new mongoose.Schema({
  apartmentPhotoUrl: { // Add this field if it doesn't exist
    type: String,
    default: null, // Optional: default to null if no photo uploaded
  },
  sellApartmentSize: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  userName: {
    type: String,
    required: true,
  },
});

const SellRecord = mongoose.model('newSellRecord', sellRecordSchema);
export default SellRecord;