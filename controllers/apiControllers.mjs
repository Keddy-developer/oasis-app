import axios from 'axios';
import moment from 'moment';
import fs from 'fs';
import { error, timeStamp } from 'console';
import { response } from 'express';

async function getAccessToken(){
  const consumer_key = "F6cqEpbBs2qGjApzUzzXQKKGG4vnu4e6tRSVWNu1SGhpf6Kp"; // REPLACE IT WITH YOUR CONSUMER KEY
  const consumer_secret = "4hyl6ivfAjqZ44gmpIgFKSrGBMTxRzEEHQDOah45bEsfwhq261OaWJv1F70PFwmc"; // REPLACE IT WITH YOUR CONSUMER SECRET
  const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const auth = 'Basic ' + Buffer.from(consumer_key + ':' + consumer_secret).toString('base64');


   try {
    const res = await axios.get ( url, {
      headers: {
        Authorization: auth
      }
    })

    const accessToken = res.data.access_token;
    return accessToken
    
   } catch (error) {
    throw error
   }

}


export const stkpush_post = (req, res) =>{
  getAccessToken()
  .then((accessToken)=>{
    const url = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
    const auth = 'Bearer ' + accessToken;
    const BusinessShortCode = "174379";
    const Passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    const timeStamp = moment().format('YYYYMMDDHHmmss')
    const password = 'Basic' + Buffer.from(BusinessShortCode + Passkey + timeStamp.toString('base64')) 
    
    const amount = req.body.amount;
    const phone = req.body.phone;


    axios.post(url, {
      BusinessShortCode: "174379",
      Password: password,
      Timestamp: timeStamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone, // Phone number to receive the STK push
      PartyB: "174379",
      PhoneNumber: phone,
      CallBackURL: "https://249e-105-60-226-239.ngrok-free.app/api/callback", // Corrected URL
      AccountReference: "Oasis Pay",
      TransactionDesc: "Mpesa Daraja API STK push test",

    },
  {
    headers: {
      Authorization: auth
    },
  })
  .then((response) => {
    res.json({ message: "😀 Request is successfully done ✔✔." });
  })
  .catch((error) => {
    console.error("Error during STK push:", error.response ? error.response.data : error.message);
    res.status(500).json({ message: error.response ? error.response.data.errorMessage : "❌ An error occurred." });
  });
  })
   

  .catch(console.error)
}



