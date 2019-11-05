//const fs = require('fs');
const Tour = require('./../models/tourModel');
const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

const multerFilter = (req, file, cb) => {
  // to check if file is image
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an Image !! Please only upload image', 400), false);
  }
};

const multerStorage = multer.memoryStorage();

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

// upload.array('images',3);
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover Image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];

  // HERE forEach should not be used for async/await as we are not awatitng it as it is inside callback of forEach so we use map
  // req.files.images.forEach(async (file, i) => {
  //   const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

  //   await sharp(req.files.imageCover[0].buffer)
  //     .resize(2000, 1333)
  //     .toFormat('jpeg')
  //     .jpeg({ quality: 90 })
  //     .toFile(`public/img/tours/${filename}`);

  //   req.body.images.push(filename);
  // });

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

exports.aliasTopTour = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = 'price,-ratingsAverage';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

////////// USED FOR TEACHING ROUTES WITH JSON FILE ////////////////////////////////////////////
// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

// exports.checkID = (req, res, next, val) => {
//   console.log(`Tour id is : ${val}`);
//   if (val * 1 > tours.length) {
//     return res.status(404).json({
//       status: 'failed',
//       message: 'invalid ID'
//     });
//   }
//   next();
// };

//////////////// HOW TO VALIDATE WITH MIDDLEWARES ////////////////////////////////////////////////
// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'failed',
//       message: 'Missing name or price'
//     });
//   }
//   next();
// };
/////////////////////////////////////////////////////////////////////////////////////////////////////////

//Get all tours by factory functions
exports.getAllTours = factory.getAll(Tour);

// exports.getAllTours = catchAsync(async (req, res, next) => {
//   ///console.log(req.requestTime);
//   // try {
//   //   console.log(req.query);
//   //   // BUILD QUERY
//   //   // 1A) Filtering
//   //   // Creating a hard copy of Object by first distructuring using ... and then creating object out of it
//   //   // const queryObj = { ...req.query };
//   //   // const excludedFields = ['page', 'sort', 'limit', 'fields'];
//   //   // excludedFields.forEach(el => delete queryObj[el]);

//   //   // // 1B) Advanced Filtering
//   //   // let queryStr = JSON.stringify(queryObj);
//   //   // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`); // g is used for all matching regular expressions
//   //   // console.log(JSON.parse(queryStr));

//   //   // STORE QUERY
//   //   //let query = Tour.find(JSON.parse(queryStr));

//   //   // const query = Tour.find()
//   //   //   .where('duration')
//   //   //   .equals(5)
//   //   //   .where('difficulty')
//   //   //   .equals('easy');

//   //   // 2) Sorting
//   //   // if (req.query.sort) {
//   //   //   const sortBy = req.query.sort.split(',').join(' ');
//   //   //   console.log(sortBy);
//   //   //   query = query.sort(sortBy);
//   //   //   // sort('price ratingsAverage') to sort given multiple fields in mongoose
//   //   // } else {
//   //   //   query = query.sort('-createdAt');
//   //   // }

//   //   // 3) Field Limiting
//   //   // if (req.query.fields) {
//   //   //   const fields = req.query.fields.split(',').join(' ');
//   //   //   query = query.select(fields); // projecting some fields
//   //   // } else {
//   //   //   query = query.select('-__v'); // everything except __v field by using -
//   //   // }

//   //   // 4) Pagination
//   //   // const page = req.query.page * 1 || 1;
//   //   // const limit = req.query.limit * 1 || 100;
//   //   // const skip = (page - 1) * limit;
//   //   // // page=3&limit=10, 1-10, page 1, 11-20, page 2, 21-30, page 3....
//   //   // query = query.skip(skip).limit(limit);

//   //   // if (req.query.page) {
//   //   //   const numTours = await Tour.countDocuments();
//   //   //   if (skip >= numTours) throw new Error('This Page does not exist');
//   //   // }

//   //   // EXECUTE QUERY
//   //   const features = new APIFeatures(Tour.find(), req.query)
//   //     .filter()
//   //     .sort()
//   //     .limitFields()
//   //     .paginate();
//   //   const tours = await features.query;

//   //   res.status(200).json({
//   //     status: 'success',
//   //     results: tours.length,
//   //     data: {
//   //       tours: tours
//   //       // tours key is from endpoint and value is json data
//   //     }
//   //   });
//   // } catch (err) {
//   //   res.status(404).json({
//   //     status: 'fail',
//   //     message: err
//   //   });
//   // }
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();

//   const tours = await features.query;

//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours: tours
//       // tours key is from endpoint and value is json data
//     }
//   });
// });

// Get one tour using Factory functions
exports.getTour = factory.getOne(Tour, { path: 'reviews' });

// exports.getTour = catchAsync(async (req, res, next) => {
//   // console.log(req.params);

//   //const tour = tours.find(el => el.id === id);
//   // try {
//   //   const tour = await Tour.findById(req.params.id);
//   //   // Tour.findOne({_id: req.params.id}) mongoose makes it easier

//   //   res.status(200).json({
//   //     status: 'success',
//   //     data: {
//   //       tour
//   //     }
//   //   });
//   // } catch (err) {
//   //   res.status(404).json({
//   //     status: 'fail',
//   //     message: err
//   //   });
//   // }
//   const tour = await Tour.findById(req.params.id).populate('reviews');

//   if (!tour) {
//     // will be called when no tour is found with given id that was able to be coverted into string
//     return next(new AppError('No tour found with given id', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour
//     }
//   });
// });

// Creating using factory functions
exports.createTour = factory.createOne(Tour);

// exports.createTour = catchAsync(async (req, res, next) => {
//   ////////////////// USED WHEN DEALING WITH FILES /////////////////////////
//   //console.log(req.body);

//   // const newId = tours[tours.length - 1].id + 1;
//   // const newTour = Object.assign({ id: newId }, req.body);

//   // tours.push(newTour);
//   // fs.writeFile(
//   //   `${__dirname}/dev-data/data/tours-simple.json`,
//   //   JSON.stringify(tours),
//   //   err => {
//   //     res.status(201).json({
//   //       status: 'success',
//   //       data: {
//   //         tour: newTour
//   //       }
//   //     });
//   //   }
//   // );

//   //res.send('Done');
//   ////////////////////////////////////////////////////////////////////////////
//   // try {
//   //   const newTour = await Tour.create(req.body);

//   //   res.status(201).json({
//   //     status: 'success',
//   //     data: {
//   //       tour: newTour
//   //     }
//   //   });
//   // } catch (err) {
//   //   res.status(400).json({
//   //     status: 'fail',
//   //     meassage: 'Invalid data Sent!'
//   //   });
//   // }
//   //////////////////////////////
//   // only try part
//   const newTour = await Tour.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour
//     }
//   });
// });

//Updating with factory functions
exports.updateTour = factory.updateOne(Tour);

// exports.updateTour = catchAsync(async (req, res, next) => {
//   // try {
//   //   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//   //     new: true,
//   //     runValidators: true
//   //   });

//   //   res.status(200).json({
//   //     status: 'success',
//   //     data: {
//   //       tour
//   //     }
//   //   });
//   // } catch (err) {
//   //   res.status(400).json({
//   //     status: 'fail',
//   //     meassage: 'Invalid data Sent!'
//   //   });
//   // }

//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true
//   });

//   if (!tour) {
//     // will be called when no tour is found with given id that was able to be coverted into string
//     return next(new AppError('No tour found with given id', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour
//     }
//   });
// });

// Deleting with factory function
exports.deleteTour = factory.deleteOne(Tour);

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   // try {
//   //   await Tour.findByIdAndDelete(req.params.id);

//   //   res.status(204).json({
//   //     status: 'success',
//   //     data: null
//   //   });
//   // } catch (err) {
//   //   res.status(400).json({
//   //     status: 'fail',
//   //     meassage: 'Invalid data Sent!'
//   //   });
//   // }

//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     // will be called when no tour is found with given id that was able to be coverted into string
//     return next(new AppError('No tour found with given id', 404));
//   }

//   res.status(204).json({
//     status: 'success',
//     data: null
//   });
// });

exports.getTourStats = catchAsync(async (req, res, next) => {
  //try {
  // aggregrate returns aggregrate object
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        // _id: null, // for calculating averages of all tours
        _id: { $toUpper: '$difficulty' },
        numRatings: { $sum: '$ratingsQuantity' },
        numTours: { $sum: 1 },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
        // the fields we have now in documents is the one defined above in group and original fields are removed
      }
    },
    {
      $sort: { avgPrice: 1 } // 1 for ascending
    }
    // {
    //   // matching multiple times
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
  // } catch (err) {
  //   res.status(400).json({
  //     status: 'fail',
  //     meassage: 'Invalid data Sent!'
  //   });
  // }
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  //try {
  const year = req.params.year * 1;
  const plan = await Tour.aggregrate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' } // Creating an array of which tours for months
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
  // } catch (err) {
  //   res.status(400).json({
  //     status: 'fail',
  //     meassage: 'Invalid data Sent!'
  //   });
  // }
});

// finding tours within specific distance
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params; // using destructuring
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; // converting into radians by dividing radius of earth

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latittude and longitude in correct format :lat,lng',
        400
      )
    );
  }
  //console.log(distance, lat, lng, unit);
  // To Work with Geospatial queries we need index of field we are searching thru so we make a index of startLocation
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  }); // geowithin is a  geospatial operator

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params; // using destructuring
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latittude and longitude in correct format :lat,lng',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      // Only geospatial pipeline stage that actually exists ,always needs to be first stage
      $geoNear: {
        // a field need to have its index to perform calculation in geoNear, here we have already startLocation
        near: {
          type: 'point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance', // reurns distance in field name distance (in metres)
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});
