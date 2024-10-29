import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables from config.env
dotenv.config();

const sendEmail = async (option) => {

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT, 
    auth: {
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASSWORD 
    }
  });
  
  
  // Define the email options
  const emailOptions = { 
    from: 'Keddy Support <gideonoro01@gmail.com>',
    to: option.email,
    subject: option.subject,
    text: option.message
  };

  // Send the email
  try {
    await transporter.sendMail(emailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

export default sendEmail;
