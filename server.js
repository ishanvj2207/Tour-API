const mongoose = require('mongoose');
const dotenv = require('dotenv');

// handling uncaught exception - synchronus unhandled
process.on('uncaughtException', err => {
  console.log('Unhandled exception: Shutting Down...');
  console.log(err);
  // giving server time to complete running requests and thus closing process gracefully
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

// console.log(process.env);

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(() => console.log('DB CONNECTION SUCCESSFULL'));

const port = 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// handling unhandled rejection globally by event listeners
process.on('unhandledRejection', err => {
  console.log('Unhandled rejection: Shutting Down...');
  console.log(err.name, err.message);
  // giving server time to complete running requests and thus closing process gracefully
  server.close(() => {
    process.exit(1); // 1 stands for uncaught exception
  });
});
