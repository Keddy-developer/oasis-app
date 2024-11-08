import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  amount: Number,
  mpesaReceiptNumber: String,
  transactionDate: Date,
  phoneNumber: String,
});

export default mongoose.model('Transaction', transactionSchema);