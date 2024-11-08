import User from '../models/user.js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import dotenv from 'dotenv';
import sendEmail from '../utils/email.js'
import Record from '../models/recordModel.js';

dotenv.config();

const adminEmails = ['gideonoro01@gmail.com'];
const maxAge = 3 * 24 * 60 * 60;

// Custom error handling
class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle errors function
const handleErrors = (err) => {
  console.log(err.message, err.code);
  let errors = { email: '', password: '', userName: '', apartmentNo: '' };

  // Incorrect credentials
  if (err.message === 'Incorrect email') {
    errors.email = 'That email is not registered';
  }
  if (err.message === 'Incorrect password') {
    errors.password = 'That password is incorrect';
  }

  // Duplicate error code
  if (err.code === 11000) {
    if (err.keyValue.email) errors.email = 'That email is already registered';
    if (err.keyValue.userName) errors.userName = 'That username is already registered';
    if (err.keyValue.apartmentNo) errors.apartmentNo = 'That apartment number is already registered';
  }

  // Validation errors
  if (err.message.includes('user validation failed')) {
    Object.values(err.errors).forEach((properties) => {
      errors[properties.path] = properties.message;
    });
  }
  return errors;
};

// Token creation
const createToken = (id) => jwt.sign({ id }, process.env.SECRET_STR, { expiresIn: maxAge });

// Route handler for signup
export const signup_post = async (req, res) => {
  const { userName, apartmentNo, email, password } = req.body;

  // Determine role based on email
  const role = adminEmails.includes(email) ? 'admin' : 'apartmentOwner';

  try {
    // Check for duplicate fields
    const existingUserName = await User.findOne({ userName });
    const existingApartmentNo = await User.findOne({ apartmentNo });
    const existingEmail = await User.findOne({ email });

    if (existingUserName) return res.status(400).json({ errors: { userName: 'That username is already registered' } });
    if (existingApartmentNo) return res.status(400).json({ errors: { apartmentNo: 'That apartment number is already registered' } });
    if (existingEmail) return res.status(400).json({ errors: { email: 'That email is already registered' } });
   
    // Create new user
    const apartmentNoExist = await Record.findOne({apartmentNo})
    if (apartmentNoExist || role === 'admin') {
      const user = await User.create({ userName, apartmentNo, email, password, role });
      const token = createToken(user._id);
  
      res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
      res.status(201).json({ user: user._id });
    } else {
      res.status(400).json({ errors: { apartmentNo: 'That apartment number is not registered in Oasis' } })
    }
   
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};


export const signup_get = (req, res)=>{
    res.render('signup')
}

export const login_get = (req, res)=>{
    res.render('login')
}

export const login_post = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);
    const token = createToken(user._id);

    // Set cookie with the JWT
    res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
     
    
    // Set session user
    req.session.user = {
      id: user._id,
      role: user.role 
    };

    res.status(200).json({ user: user._id });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};

export const logout_get = async (req, res)=>{
  res.cookie('jwt', '', {maxAge: 1})
  res.redirect('/')
}

export const update_post = async (req, res, next) => {
  const { email, currentPassword, newPassword, confirmPassword } = req.body;

  try {
    // Check if the user exists and password is correct
    console.log("Checking user login...");
    const user = await User.login(email, currentPassword); // Verifies email and current password
    
    if (!user) {
      return next(new CustomError('The current password you provided is wrong', 401));
    }

    // Check if the new password matches confirm password
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ errors: { password: 'New passwords do not match' } });
    }

    // Update the user's password
    user.password = newPassword; // The confirmPassword field is not needed here
    await user.save();

    // Generate a new JWT token
    const token = createToken(user._id);
    res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });

    // Respond with the user ID
    res.status(200).json({ user: user._id });

  } catch (err) {
    console.error("Error updating password:", err);
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};
// Get record details to render the update form
export const getUpdateProfile = async (req, res) => {
  const id = req.user._id;
  try {
    const record = await User.findById(id);
    if (!record) {
      res.status(404).json(alert('Please create a profile.'));
      res.redirect('/profile')
    }

    res.render('updateProfile', { record, currentRoute: req.path });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
// Update a profile
export const updateProfile_patch = async (req, res) => { 
  const { id } = req.params;
  const { userName, apartmentNo } = req.body;
console.log(req.file)
  try {
      // Check for existing username or apartment number
      const existingUserName = await User.findOne({ userName });
      const existingApartmentNo = await User.findOne({ apartmentNo });

      if (existingUserName) {
          return res.status(400).json({ errors: { userName: 'That username is already registered' } });
      }
      if (existingApartmentNo) {
          return res.status(400).json({ errors: { apartmentNo: 'That apartment number is already registered' } });
      }

      // Prepare the update object
      const updateData = {
          userName,
          apartmentNo,
      };
  console.log(req.file.filename)
      // Check if a file has been uploaded
      if (req.file) {
          updateData.photoUrl = `/uploads/${req.file.filename}`; // Add the photo URL if a file was uploaded
      }

      // Update user if no errors found
      const record = await User.findByIdAndUpdate(id, updateData, { new: true });
      if (record) {
          res.status(200).json(record);
      } else {
          res.status(404).json({ errors: { general: 'Failed to save. Try again.' } });
      }
  } catch (err) {
      res.status(500).json({ errors: { general: err.message } });
  }
};


export const delete_post = async (req, res)=>{
  const {email, password} = req.body;

  try{
    const user = await User.login(email, password);

    if(user){
      await user.deleteOne({ _id: user._id});
      res.cookie('jwt', '', {maxAge: 1 });

    res.status(200).json({message: 'Account successfully deleted.'})
    }
  } catch (err){
    const errors = handleErrors(err);
    res.status(400).json({errors})
  }
};

export const forgot_post = async (req, res) => {
  console.log("Forgot password request received");
  const { email } = req.body;

  try {
      // Check if the user exists
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(400).json({ errors: { email: 'Email not found' } });
      }

      // Generate a password reset token
      const resetToken = user.createResetPasswordToken();
      await user.save({ validateBeforeSave: false });

      // Create the password reset URL
      const resetUrl = `${req.protocol}://${req.get('host')}/resetPassword/${resetToken}`;
      const message = `We have received a password reset request. Please use the below link to reset your password:\n\n${resetUrl}\n\nThis reset password link will be valid only for 10 minutes.`;

      // Send the password reset email
      try {
          await sendEmail({
              email: user.email,
              subject: 'Password Change Request Received',
              message: message,
          });
          res.status(200).json({ message: 'Password reset link sent successfully.' });
          
      } catch (emailError) {
          // Reset the reset token fields in case of email failure
          user.passwordResetToken = undefined;
          user.passwordResetTokenExpires = undefined;
          await user.save({ validateBeforeSave: false });

          // Return an error response
          res.status(500).json({
              status: 'error',
              message: 'There was an error sending the password reset email. Please try again later.',
          });
      }
  } catch (error) {
      // Handle any unexpected errors
      console.error("Error in forgot password process:", error);
      res.status(500).json({
          status: 'error',
          message: 'An unexpected error occurred. Please try again later.',
      });
  }
};
export const resetPassword = async (req, res, next) => {
  const token = crypto.createHash('sha256').update(req.params.token).digest('hex');

  // Find the user with the given token
  const userFound = await User.findOne({
    passwordResetToken: token,
    passwordResetTokenExpires: { $gt: Date.now() }
  });

  // Check if the user was found
  if (!userFound) {
    const error = new CustomError('Token is invalid or has expired!', 400);
    return next(error);
  }

  // Check if the passwords match
  if (req.body.password !== req.body.confirmPassword) {
    const error = new CustomError('Passwords do not match!', 400);
    return next(error);
  }

  // Proceed to reset the password
  userFound.password = req.body.password; // Set the new password
  userFound.confirmPassword = req.body.confirmPassword; // It's good practice to check but not save

  userFound.passwordResetToken = undefined;
  userFound.passwordResetTokenExpires = undefined;
  userFound.passwordChangedAt = Date.now();

  // Save the user document
  await userFound.save(); // Ensure to await save

  const loginToken = createToken(userFound._id); // Create a new login token

  res.status(200).json({
    status: 'success',
    token: loginToken
  });
};

