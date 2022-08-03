const express = require('express');
const verifyToken = require('../middlewares/verify-token');

const router = express.Router();

// * requiring models
const User = require('../models/User');

// ? ======= GET USER ROUTE
/**
 * - get route
 * - private
 */
router.get('/', verifyToken, async (req, res) => {
  res.json(req.user);
});

// ? ======= EDIT USER ROUTE
/**
 * - edit route
 * - private
 */
router.put('/', verifyToken, async (req, res) => {
  // * user can edit following fields only
  /**
   * location
   * qualification
   * profession
   * hobbies
   * interests
   * description
   */
  try {
    /**
     * edit = { hobbies: [1,23,4], interests: [2,24,1] }
     */
    const user = await User.findByIdAndUpdate(req.user.id, req.body.update, {
      new: true,
    });

    res.json({
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ server: { msg: 'internal server error' } });
  }
});

// ? ======= DELETE USER ROUTE
/**
 * - delete route
 * - private
 */
router.delete('/', verifyToken, async (req, res) => {
  try {
    const response = await User.findByIdAndDelete(req.user.id);
    res.json({ response });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ server: { msg: 'error deleting the account, try again later' } });
  }
});

module.exports = router;
