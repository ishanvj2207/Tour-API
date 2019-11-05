const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name !']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true, //not a validator just cconverts
    validate: [validator.isEmail, 'Please provide a valid Email']
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This custom validator only works on SAVE and CREATE !!
      // So it is required to use save but not only findOneAndUpdate
      validator: function(el) {
        return el === this.password;
      },
      message: 'Password are not the same !'
    }
  },
  passwordChangedAt: Date, // To know if password was changed after issuing JWT
  passwordResetToken: String, // To Store reset token generated
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

userSchema.pre('save', async function(next) {
  // only had to be run when only password is changed or created
  if (!this.isModified('password')) return next();

  // hash is asynchronous function
  this.password = await bcrypt.hash(this.password, 12); // 12 is cost of hashing function
  // now we only need passwordConfirm for validation and it has not to be persisted in DB
  this.passwordConfirm = undefined; // this deletes or make it to not persist the field
  next();
});

// middleware for setting changedPasswordAt
userSchema.pre('save', function(next) {
  // only run when password is changed , also not when new document was created
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1; // 1 is subtracted as there might be difference between issuing JWT and saving document
  next();
});

// Query middleware to hide active property
userSchema.pre(/^find/, function(next) {
  // this points to current query
  this.find({ active: { $ne: false } });
  next();
});

// checking if given password is same as stored in DB
// instance method -- available to all documents in a collection
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  // this.password can't be used as password is not accessible
  return await bcrypt.compare(candidatePassword, userPassword);
};

//Instance method to check if password was changed after issuing token
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    ); // since it was in milliseconds
    console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp;
  }
  return false; // User has not changed the password
};

// instance method for sending token on forgot password
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex'); // reset token is basically a new password for user who now want to change password
  // we should not store this random token directly into DB so we encode it
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 mins from now

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
