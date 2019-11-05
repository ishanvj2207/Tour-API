const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// const User = require('./userModel'); // This is needed in case of embedding guides into tours

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxLength: [40, 'A Tour name must have less or equal than 40 characters'],
      minLength: [10, 'A Tour name must have more or equal than 10 characters']
      //validate: [validator.isAlpha, 'Tour name must only contain characters']
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a maxGroupSize']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium or difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: val => Math.round(val * 10) / 10 // setter function revoked each time a new val is set
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      // custom validator to check if discount is less than price
      validate: {
        validator: function(val) {
          // this only points to current doc pn new Document Creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price' //({VALUE}) gets same value as val
      }
    },
    summary: {
      type: String,
      trim: true, // only for string type options
      required: [true, 'A tour must have a description']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a imageCover']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Creating Indexes
// Single Field Index
//tourSchema.index({ price: 1 }); // 1 for ascending and -1 for descending
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // if using real 2d points so we tell that startLocation is to be indexed to 2d sphere

// Multiple Field Index
tourSchema.index({ price: 1, ratingsAverage: -1 });

// Not actual part of database - virtual
tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7; // a real function not arrow function as we require this keyword that points to current document
});

// virtual populate tour with reviews
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', // the field where it is stored in referenced model
  localField: '_id'
});

// Middlewares = Pre and Post Hooks , here save or create are known as hooks

//Document Middleware run before .save() and .create() but not .insertMany()
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Example middleware for embedding guides into tour doccuments
// tourSchema.pre('save', async function(next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   // since async functions returns promises so we have array of promises
//   this.guide = await Promise.all(guidesPromises); // since all promises have to be awaited we use Promise.all
//   next();
// });

// tourSchema.post('save', function(doc, next)){
//   console.log(doc);
//   next();
// }

//Query Middleware
//tourSchema.pre('find', function(next) {
// tourSchema.pre(/^find/, function(next) {
//   // All Strings starting with find
//   this.find({ secretTour: { $ne: true } });
//   // queryObj is just like a normal object
//   this.start = Date.now(); // Added to get the date
//   next();
// });

// tourSchema.post(/^find/, function(docs, next) {
//   // docs is all documents returned by query
//   console.log(`Query took ${Date.now() - this.start} milliseconds !`);
//   console.log(docs);
//   next();
// });

tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-_v -passwordChangedAt'
  });
  next();
});

// Aggregation Middleware
// secret Tours are still being calculated in aggregations , to remove them we can add a match in every aggregation but it would be better practice to remove it at model level
// tourSchema.pre('aggregrate', function(next) {
//   // to add match at beginning of pipeline array we use unshift
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

//   console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
