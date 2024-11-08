import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
    default: () => new Date().getFullYear(), // Automatically set to the current year if not provided
  },
  amountCollected: {
    type: Number,
    required: false,
    default: 0,
  },
  amountOwed: {
    type: Number,
    required: false,
    default: 0,
  },
});
const paymentAttemptSchema = new mongoose.Schema({
    year: {
        type: Number,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
  
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'], // Possible statuses
        default: 'pending', // Mark as pending initially
        required: true,
    },
    merchantRequestID: { type: String, required: false },
    timestamp: {
        type: Date,
        default: Date.now, // Automatically set to the current timestamp
        required: true,
    }
});

const transactionSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  mpesaReceiptNumber: {
    type: String,
    required: true,
  },
  transactionDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
});

const recordSchema = new mongoose.Schema({
  apartmentOwner: {
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
    type: Number,
    required: true,
  },
  paymentAttempts: [paymentAttemptSchema],
  transactionsModel: [transactionSchema], // Array of transaction documents
  paymentModel: [paymentSchema], // Array of payment documents, where each year’s payment info will be stored
  date: {
    type: Date,
    default: Date.now,
  },
  
},
{ versionKey: false });

const Record = mongoose.model('Record', recordSchema);
export default Record;
