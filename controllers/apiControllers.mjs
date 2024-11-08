import axios from 'axios';
import moment from 'moment';
import fs from 'fs';
import { error, timeStamp } from 'console';
import { response } from 'express';
import Record from '../models/recordModel.js';

async function getAccessToken(){
  const consumer_key = "F6cqEpbBs2qGjApzUzzXQKKGG4vnu4e6tRSVWNu1SGhpf6Kp"; // REPLACE IT WITH YOUR CONSUMER KEY
  const consumer_secret = "4hyl6ivfAjqZ44gmpIgFKSrGBMTxRzEEHQDOah45bEsfwhq261OaWJv1F70PFwmc"; // REPLACE IT WITH YOUR CONSUMER SECRET
  const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const auth = 'Basic ' + Buffer.from(`${consumer_key}:${consumer_secret}`).toString('base64');
  console.log('Consumer Key:', consumer_key);
  console.log('Consumer Secret:', consumer_secret);


   try {
    const res = await axios.get ( url, {
      headers: {
        Authorization: auth
      }
    })

    const accessToken = res.data.access_token;
    console.log(accessToken)
    return accessToken
  
    
   } catch (error) {
    throw error
   }

}


export const stkpush_post = (req, res) => {
  getAccessToken()
    .then((accessToken) => {
      const url = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
      const auth = 'Bearer ' + accessToken;
      const BusinessShortCode = "174379";
      const Passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
      const timeStamp = moment().format('YYYYMMDDHHmmss');
      const password = Buffer.from(BusinessShortCode + Passkey + timeStamp).toString('base64');
      
      const amount = req.body.amount;
      const phone = req.body.phone;
      const year = req.body.year;
      const apartmentNo = req.user.apartmentNo;


      // Step 1: Temporarily save the transaction with a "pending" status
      Record.findOne({ apartmentNo })
        .then((record) => {
          if (record) {
            // Create a temporary transaction entry with "pending" status
            const transactionAttempt = {
              year,
              amount,
              phone,
              status: 'pending', // Mark as pending initially
              merchantRequestID: null,
              timestamp: new Date(),
            };
            console.log(transactionAttempt)
            record.paymentAttempts.push(transactionAttempt);  // Push to a paymentAttempts array
            return record.save();
          } else {
            return res.status(404).json({ message: 'Record not found' });
          }
        })
        .then((record) => {
          // Step 2: Proceed with the STK push
          axios.post(url, {
            BusinessShortCode: "174379",
            Password: password,
            Timestamp: timeStamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: phone,
            PartyB: "174379",
            PhoneNumber: phone,
            CallBackURL: "https://6a8f-102-222-4-129.ngrok-free.app/api/callback", // Your callback URL
            AccountReference: apartmentNo,
            TransactionDesc: "Mpesa Daraja API STK push test",
          }, {
            headers: { Authorization: auth },
          })
            .then((response) => {
              const merchantRequestID = response.data.MerchantRequestID
              record.paymentAttempts[record.paymentAttempts.length - 1].merchantRequestID = merchantRequestID;
              record.save();
              res.json({ message: "Complete the payment by entering pin on your phone ✔✔." });
            })
            .catch((error) => {
              console.error("Error during STK push:", error.response ? error.response.data : error.message);
              res.status(500).json({ message: error.response ? error.response.data.errorMessage : "❌ An error occurred." });
            });
        })
        .catch((error) => {
          console.error("Error saving attempt:", error);
          res.status(500).json({ message: "Error saving attempt to the database" });
        });
    })
    .catch(console.error);
};

export const apiCallback_post = async (req, res) => {
  console.log("STK PUSH CALLBACK");

  const stkCallback = req.body.Body.stkCallback;

  try {
    if (!stkCallback.CallbackMetadata || typeof stkCallback.CallbackMetadata !== 'object') {
      console.log('Error making payment');
      return res.status(404).json({ message: 'Error making payment' });
    } else {
      const amount = stkCallback.CallbackMetadata.Item.find(item => item.Name === 'Amount').Value;
      const mpesaReceiptNumber = stkCallback.CallbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber').Value;
      const merchantRequestID = stkCallback.MerchantRequestID;
      const transactionDate = new Date(stkCallback.CallbackMetadata.Item.find(item => item.Name === 'TransactionDate').Value);
      const phoneNumber = stkCallback.CallbackMetadata.Item.find(item => item.Name === 'PhoneNumber').Value;

      const transactionData = {
        year: paymentAttempt.year,
        amount,
        mpesaReceiptNumber,
        transactionDate,
        phoneNumber,
      };

      // Find the record using MerchantRequestID
      const record = await Record.findOne({ "paymentAttempts.merchantRequestID": merchantRequestID });

      if (!record) {
        return res.status(404).json({ message: 'Record not found' });
      }

      // Retrieve the original `year` associated with the payment attempt
      const paymentAttempt = record.paymentAttempts.find(
        attempt => attempt.merchantRequestID === merchantRequestID
      );

      if (!paymentAttempt) {
        return res.status(400).json({ message: 'Transaction attempt not found or already processed' });
      }

      const year = paymentAttempt.year;

      // Add the transaction to the transactions model
      record.transactionsModel.push(transactionData);

      // Update or create payment data for the correct year
      const payment = record.paymentModel.find(p => p.year === year);
      if (payment) {
        payment.amountCollected += amount;
        payment.amountOwed -= amount;
      } else {
        record.paymentModel.push({
          year,
          amountCollected: amount,
          amountOwed: record.serviceCharge,
        });
      }

      // Remove the processed payment attempt from the array
      record.paymentAttempts = record.paymentAttempts.filter(
        attempt => attempt.merchantRequestID !== merchantRequestID
      );

      // Save the updated record with the new transaction and payment data
      await record.save();

      res.status(200).json({ message: 'Transaction saved successfully', transaction: transactionData });
    }
  } catch (error) {
    console.error("Error processing callback:", error);
    res.status(500).json({ message: 'Error processing callback' });
  }
};