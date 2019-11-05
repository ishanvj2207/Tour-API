// Here it is not made that if user has bought the tour then only he/she can review it
// All other shortcomings or things to do are in last vidoe of section - 13 final consideration
const express = require('express');
const bookingController = require('./../controllers/bookingController');
const authController = require('./../controllers/authController');
const router = express.Router();

router.use(authController.protect);

router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

router.use(authController.restrictTo('admin', 'lead-guide'));

router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
