const express = require('express');
const multer = require('multer');
const userController = require('./../controllers/userController');
const router = express.Router();
const authController = require('./../controllers/authController');

// routes for User - authController
// creating a new route for signup makes sense to go out of REST architecture
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword); // patch as we only want to change password

// since router is a mini sub-application we can use middleware on it
// after this every handler needs to be authenticated in order to use protect we use middleware
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);

//  Creating a /me route
router.get('/me', userController.getMe, userController.getUser);

router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete('/deleteMe', userController.deleteMe);

// routes basically for Admin - userController
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
