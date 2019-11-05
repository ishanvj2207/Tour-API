const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

// Create a Cookie
const cookieOptions = {
  expires: new Date(
    Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  ),

  httpOnly: true // browser don't have permission for accessing or modifying cookies
};

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Cookie
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; // allowing only on https protocol
  res.cookie('jwt', token, cookieOptions);

  //Remove Password Just From Output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token, // we send the token which should be stored somewhere when a new user is created
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);

  // const token = signToken(newUser._id);

  // // 201 for written
  // res.status(201).json({
  //   status: 'success',
  //   token, // we send the token which should be stored somewhere when a new user is created
  //   data: {
  //     user: newUser
  //   }
  // });
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('please provide email and password!', 400));
  }

  //2) Check if user exists and password is correct
  const user = await User.findOne({ email: email }).select('+password'); // findOne does not contain password as its select is set to false but since we want the password we use select with a +
  //const correct = await user.correctPassword(password, user.password); // since instance method is available on all documents so directly used for user
  if (user) console.log(password);

  if (!user || !(await user.correctPassword(password, user.password))) {
    // second condition is checked only if first is true
    return next(new AppError('Incorrect Email or password', 401));
  }

  //3) if Everything is correct, send token to client
  // const token = signToken(user._id);
  // //console.log(token);
  // res.status(200).json({
  //   status: 'success',
  //   token
  // });
  createSendToken(user, 200, res);
});

// for logging out with cookies set to httpOnly we set the cookie to null string and expire that in order to have a sort of delete function
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  //1) Getting token and check if it exists
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  //console.log(token);
  if (!token) {
    return next(new AppError('You are not logged in'), 401); // 401 for unauthorized
  }

  //2) Verfication Token
  // jwt.verify is a async function and to make it work with async/await rather than callback we have to promisify the function
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //console.log(decoded);

  // These Two next steps are for security purposes

  //3) Check if User still exists , if the user has been deleted in meantime he can still log in
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(
      new AppError('The User belonging to the token no longer Exists', 401)
    );

  //4) check if user changed password after token was issued
  // console.log(currentUser.changedPasswordAfter(decoded.iat));
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed Password! Please Log in again', 401)
    );
  }

  // Grant access to protected route
  req.user = currentUser; // making user daata available directly on request for easy access ahead
  res.locals.user = currentUser;
  next();
});

// middleware for website rendering for checking login , so no error
// similar to protect middleware
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // Verify Token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      const currentUser = await User.findById(decoded.id);
      if (!currentUser) return next();
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // There is a logged in User if we reach until this point
      res.locals.user = currentUser; // res.locals is available to each template and we create a new property user over it
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// to pass in arguements of roles into middleware function
// we creatre a wrapper function which returns the middleware function in need
exports.restrictTo = (...roles) => {
  // creating a array of arguements called roles
  return (req, res, next) => {
    // roles ['admin','lead-guide']
    if (!roles.includes(req.user.role)) {
      // req.user is stored in protect middleware
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address', 404));
  }
  //2) Generate the random reset token (not a JWT token)
  const resetToken = user.createPasswordResetToken();
  //when above function is called we just modify document but not save it since we have to put
  await user.save({ validateBeforeSave: false }); // validateBeforeSave is set to false as when we use forgot password we have not specified all required fields so this will deactivate all validators

  //3) Send it to User's Email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  //const message = `Forgot your Password ? Submit a PATCH request with password to ${resetURL}.\n If you didn't forget please ignore`;

  // we do not use global error handler class as we want to do more than just sending error msg
  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your Password Reset Token only valid for 10 mins.',
    //   message
    // });
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return new AppError(
      'There was a error sending the Email Try Again later',
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get User Based on Token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  //2) If token has not expired and a user is there , set new password
  if (!user) {
    return next(new AppError('Token has expired or is invalid', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  //3) Update changedPasswordAt
  // A middleware is made to to do this everytime save or created is used

  //4) Log the user in,send JWT
  // const token = signToken(user._id);
  // //console.log(token);
  // res.status(200).json({
  //   status: 'success',
  //   token
  // });
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    return next(new AppError('You must Login', 401));
  }

  // 2)Check if posted password is correct
  const password = req.body.passwordCurrent;
  if (!(await user.correctPassword(password, user.password))) {
    return next(new AppError('Entered Password is not correct', 401));
  }

  // 3)If correct , then update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) login user now
  createSendToken(user, 200, res);
});
