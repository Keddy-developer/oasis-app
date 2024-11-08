import mongoose from 'mongoose';
import pkg from 'validator';
import bcrypt from 'bcrypt';
import crypto from 'crypto';


const { isEmail } = pkg;
const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: [true, 'Please enter a user name'],
        unique: true,
    },
    apartmentNo: {
        type: String,
        required: [true, 'Please enter an apartment number'],
        unique: true,
    },
    photoUrl: {
        type: String,
        default: null, 
      },
    email: {
        type: String,
        required: [true, 'Please enter an email'],
        unique: true,
        lowercase: true,
        validate: [isEmail, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please enter a password'],
        minlength: [6, 'Minimum password length is 6 characters']
    },
    role: {
        type: String,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpires: Date

});

// Post-save hook
userSchema.post('save', (doc, next) => {
    console.log('New user was created and saved:', doc);
    next();
});

// Pre-save hook for password hashing
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        console.log('Password not modified, skipping hashing');
        next();
    } else {
        console.log('Password modified, hashing...');
        const salt = await bcrypt.genSalt();
        this.password = await bcrypt.hash(this.password, salt);
        console.log('Password hashed successfully');
        next();
    }
});

// Static method to login user
userSchema.statics.login = async function (email, password) {
    const user = await this.findOne({ email });
    if (user) {
        const auth = await bcrypt.compare(password, user.password);
        if (auth) {
            console.log('Password matches, login successful');
            return user;
        }
        console.log('Incorrect password');
        throw Error('Incorrect password');
    }
    console.log('Email not found');
    throw Error('Incorrect email');
};

userSchema.methods.createResetPasswordToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex')

    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;

console.log(resetToken, this.passwordResetToken)
    return resetToken

}

const User = mongoose.model('user', userSchema);

export default User;
