import mongoose from 'mongoose';
import pkg from 'validator';

const { isEmail } = pkg;

const sellRecordSchema = new mongoose.Schema({
  apartmentPhotoUrl: {
    type: String,
    default: null,
  },
  sellApartmentSize: {
    type: String,
    required: true,
  },
  bedroomsNo: {
    type: Number,
    required: true,
  },
  squareFootage: {
    type: Number,
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
  userName: {
    type: String,
    required: true,
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

const SellRecord = mongoose.model('newSellRecord', sellRecordSchema);
export default SellRecord;
