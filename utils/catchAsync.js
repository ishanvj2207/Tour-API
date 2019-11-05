module.exports = fn => {
  // this anonymous function is returned to any of handler Function
  // which in turn will only be called when corresponding route is hit
  return (req, res, next) => {
    fn(req, res, next).catch(err => next(err)); // here fn is the async function that returns a promise and if rejected then that error is propagated to global error handlin middleware
  };
};
