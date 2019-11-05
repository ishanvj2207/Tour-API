const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const Review = require('./../models/reviewModel');
const factory = require('./handlerFactory');

// exports.getAllReviews = catchAsync(async (req, res) => {
//   // If there is a tourId then only find reviews for that tour
//   let filter = {};
//   if (req.params.tourId) filter = { tour: req.params.tourId };

//   const reviews = await Review.find(filter);

//   res.status(201).json({
//     status: 'success',
//     results: reviews.length,
//     data: {
//       reviews
//     }
//   });
// });
exports.getAllReviews = factory.getAll(Review);

// Middleware used for setting tour and user ids in nested routes
// so that create review can be controlled by createOne factory function
exports.setTourUserIds = (req, res, next) => {
  // Allowing nested routes to set tour and user ids
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// setTourUserIds runs before this createOne
exports.createReview = factory.createOne(Review);
exports.getReview = factory.getOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
