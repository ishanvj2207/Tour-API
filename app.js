const path = require('path');
const fs = require('fs');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError.js');
const globalErrorHandler = require('./controllers/errorController');
const userRouter = require('./routes/userRoutes.js');
const tourRouter = require('./routes/tourRoutes.js');
const reviewRouter = require('./routes/reviewRoutes.js');
const bookingRouter = require('./routes/bookingRoutes.js');
const viewRouter = require('./routes/viewRoutes.js');

// Start express app
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// GLOBAL MIDDLEWARES
// Serving Static files
// app.use(express.static(`{__dirname}/public`)); //serving static files from folders
app.use(express.static(path.join(__dirname, 'public')));

// Set Security HTTP Headers
app.use(helmet());

// Development Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // allowing 100 requests per hour
  message: 'Too many requests from this IP,please try again in an hour !!'
});
app.use('/api', limiter); // using the limiter middleware

// Body Parser , reading data from body into req.body
app.use(express.json({ limit: '10kb' })); // limiting data from req.body
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // parse urlencoded data into req.body
app.use(cookieParser()); // parse cookies into req.cookie

// Data Sanitization against NoSQL query Injection
// if we know some password and we write email as {$gt: ""} in login then we will be able to login for now as query is always true
app.use(mongoSanitize()); // this function mongoSanitize returns a middleware function

// Data Sanitization against cross site scripting attack
app.use(xss()); // protects against html script attacks

// Prevent Parameter Pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price'
    ] // allowing duration to repeat
  })
); // removes duplicate parameters from route that are not allowed to repeat

// app.use((req, res, next) => {
//   console.log('Hello from the middleware');
//   next();
// });

// Test Middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // here x is not defined and thus there is a uncaught exception
  // for every error in middleware function it is immediately sent to error handling middleware
  // console.log(req.cookie);
  next();
});

/*
app.get('/', (req, res) => {
  res.status(200).send('Hello from Server Side');
});

app.post('/', (req, res) => {
  res.send('You can post to this Endpoint ...');
});
*/

// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

///Mounting the routers on different routes

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/', viewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Handling unhandled routers - all is used for every possible verb like get , post etc.
// * is used for any url
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server`
  // });

  // const err = new Error(`Can't find ${req.originalUrl} on this server`);
  // err.statusCode = 404;
  // err.status = 'fail';
  // next(err);

  // whenever a arguement is passed in next express knows there is error and directly calls the error handling middleware
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
