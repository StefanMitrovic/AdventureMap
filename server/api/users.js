const router = require("express").Router();
const {
  models: { User },
} = require("../db");
module.exports = router;

router.get("/", async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "username", "points", "avatar"],
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});
