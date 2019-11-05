// Although there is no error resource but still we have this module as these are like handlers
const AppError = require('./../utils/appError');

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  // extracting given value out of error by RegEx
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/);
  const message = `Duplicate field value ${value[0]}. Please Use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  // To loop over whole Object value err.errors
  const errors = Object.values(err.errors).map(el => el.message);

  const message = `Invalid Input Data. ${errors.join(', ')}`;
  return new AppError(message, 400);
};

const handleJWTError = err =>
  new AppError('Invalid token. Please Log in again', 401);

const handleJWTExpiredError = err =>
  new AppError('Your Token has expired Please Log in Again', 401);

const sendErrorDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err
    });
  }
  // Rendered Website
  console.error('ERROR !!!', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something Went Wrong !',
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {
  //API
  if (req.originalUrl.startsWith('/api')) {
    // Operational , trusted error : send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    // Programming or other unknown errors : don't leak error details
    // 1) Log error
    console.error('ERROR !!', err);

    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong'
    });
  }
  // RENDERED WEBSITE
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something Went Wrong !',
      msg: err.message
    });
  }
  // 1) Log error
  console.error('ERROR !!', err);

  // 2) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something Went Wrong !',
    msg: 'Please Try Again'
  });
};

module.exports = (err, req, res, next) => {
  //console.log(err.stack);

  err.statusCode = err.statusCode || 500; // 500 is default if no status code is defined
  err.status = err.status || 'error'; // error is default status

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err }; // creating a hard copy out of err object so that we not have to overwrite a parameter i.e. err
    error.message = err.message;
    // Some Errors that have to be marked as operational so as to get a meaningful error message
    // 1) Invalid Database ID's
    if (error.name === 'CastError') error = handleCastErrorDB(error); // error is error returned as new AppError object making it operational

    // 2) Duplicate DB Fields (handled by error code of 11000 as caused by mongoDB Driver and not Mongoose)
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);

    // 3) Mongoose Validation Errors
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);

    // 4) Errors for JWT in protecting tour routes in case of verification
    if (error.name === 'JsonWebTokenError') error = handleJWTError(error);

    //5) For Expired Token Error
    if (error.name === 'TokenExpiredError')
      error = handleJWTExpiredError(error);

    sendErrorProd(error, req, res);
  }
};
