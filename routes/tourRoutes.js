const express = require('express');
const tourController = require('./../controllers/tourController');
const router = express.Router();
const authController = require('./../controllers/authController');
//const reviewController = require('./../controllers/reviewController');
const reviewRouter = require('./../routes/reviewRoutes');

///////////////////// HOW TO USE A MIDDLEWARE IF ONLY WE WANT TO DEAL WITH PARAMETERS IN ROUTES///////////////
//router.param('id', tourController.checkID);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Nested Routes for create Review , redirecting to review Router
router.use('/:tourId/createReview', reviewRouter);

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTour, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router
  .route('/tours-within/:distance/center/:latlng/units/:units')
  .get(tourController.getToursWithin);
// /tours-within?distance=233&center=-40,45&unit=mi this could also be done but above is std way of specifying URL with many options

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  ); ///// tourController.checkBody was used in chain to first validate before

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

// Nested Routes for explaining need for mergeParams
// router
//   .route('/:tourId/createReview')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview
//   );

module.exports = router;
