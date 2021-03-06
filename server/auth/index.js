const router = require("express").Router();
const {
  models: { User },
} = require("../db");
module.exports = router;

router.post("/login", async (req, res, next) => {
  try {
    res.send({ token: await User.authenticate(req.body) });
  } catch (err) {
    next(err);
  }
});

router.post("/signup", async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.send({ token: await user.generateToken() });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      res.status(401).send("User already exists");
    } else {
      next(err);
    }
  }
});

router.get("/me", async (req, res, next) => {
  try {
    res.send(await User.findByToken(req.headers.authorization));
  } catch (ex) {
    next(ex);
  }
});

router.put("/me", async (req, res, next) => {
  try {
    const user = await User.findByToken(req.headers.authorization);
    const updatedUser = await user.update({
      username: req.body.username,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      points: req.body.points,
      streetAddress: req.body.streetAddress,
      email: req.body.email,
      city: req.body.city,
      state: req.body.state,
      zip: req.body.zip,
    });
    res.send(updatedUser);
  } catch (ex) {
    next(ex);
  }
});
