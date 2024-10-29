import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  apartmentNo: {
    type: String,
    required: true,
  },
  apartmentSize: {
    type: String,
    required: true,
  },
  serviceCharge: {
    type: String,
    required: true,
  },
  
  date: {
    type: Date,
    default: Date.now,
  },
});

const Record = mongoose.model('Record', recordSchema);
export default Record;