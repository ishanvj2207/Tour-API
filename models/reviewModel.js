const mongoose = require('mongoose');
const Tour = require('./../models/tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review Can't be empty!"]
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Creating INdexes for not allowing duplicate reviews
reviewSchema.indexes({ tour: 1, user: 1 }, { unique: 1 }); // To make each combination of user and tour unique for avoiding duplicate reviews

reviewSchema.pre(/^find/, function(next) {
  //   this.populate({
  //     path: 'tour',
  //     select: 'name'
  //   }).populate({
  //     path: 'user',
  //     select: 'name photo'
  //   });
  this.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});

reviewSchema.statics.calculateAverageRatings = async function(tourId) {
  // this point to current model as the aggregate function needs model to operate upon
  // This is why we use static method
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  //console.log(stats);
  // Updating the tour document
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRatings,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

// Each time a new review is created this middleware is used to called to calc Stats
reviewSchema.post('save', function() {
  // this points to current review
  // Review is not defined here and even it is defined above this middleware then also this will not work as the Model would already have been created out of Schema
  // so we use this.constructor

  //Review.calculateAverageRatings(this.tour);
  this.constructor.calculateAverageRatings(this.tour);
});

// GETTING AVERAGE RATINGS AND NO. OF RATINGS WITH UPDATE AND DELETE

// for findByIdAndUpdate and findByIdAndDelete there is no document middleware
// so to get the review document , we do this
reviewSchema.pre(/^findOneAnd/, async function(next) {
  // we need to give regex as findOneAnd as BTS it works by this
  this.r = await this.findOne(); // this here points to query so on execution of query with findOne we get the Document
  // r is not updated and we cant use post instead of pre here as then we would not have query as it would already have been executed
  // so we use this.r for passing variable from pre to post
  next();
});

// since we can't use post there we will calculate stats in this middleware
reviewSchema.post(/^findOneAnd/, async function() {
  await this.r.constructor.calculateAverageRatings(this.r);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
