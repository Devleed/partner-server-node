const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const util = require('util');

const router = express.Router();

// * requiring models
const User = require('../models/User');

// * promisifying jwt.sign method for clear code
jwt.sign = util.promisify(jwt.sign);

// * helper to generate token
const generateToken = async id => {
  try {
    const token = await jwt.sign({ id }, process.env.JWT_SECRET);
    return token;
  } catch (err) {
    return err;
  }
};

// ? ======= REGISTER ROUTE
/**
 * - Register route
 * - public
 */
router.post('/register', async ({ body }, res) => {
  // raw json user body
  const userBody = {
    fullname: body.fullname,
    username: body.username,
    email: body.email,
    password: body.password,
    dob: body.dob,
    gender: body.gender,
    hobbies: body.hobbies || [],
    interests: body.interests || [],
    profession: body.profession || null,
    qualification: body.qualification || null,
    description: body.description || null,
    location: body.location || null,
  };

  try {
    // check existing user
    if (await User.findOne({ username: userBody.username }))
      return res.status(403).send({
        register: { username: 'user already exists with that username' },
      });

    // hashing password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(body.password, salt);

    // creating and saving user
    const user = await new User({
      ...userBody,
      password: hashedPassword,
    }).save();

    // generating token
    const token = await generateToken(user.id);

    // sending reponse
    res.json({
      token,
      user: {
        id: user.id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        qualification: user.qualification,
        profession: user.profession,
        gender: user.gender,
        register_date: user.register_date,
        interests: user.interests,
        hobbies: user.hobbies,
        description: user.description,
        location: user.location,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('internal server error');
  }
});

// ? ======= LOGIN ROUTE
/**
 * - Login route
 * - public
 */
router.post('/login', async (req, res) => {
  try {
    // necessary stuff
    const { username, password } = req.body;

    // try finding user
    const user = await User.findOne({ username });

    // if not found send err response
    if (!user)
      return res
        .status(401)
        .json({ login: { username: 'no user exists, with that username' } });

    // try comparnig passwords
    const isMatch = await bcrypt.compare(password, user.password);

    // if not matched send err response
    if (!isMatch)
      return res
        .status(401)
        .json({ login: { password: 'wrong password, buddy' } });

    // generate token
    const token = await generateToken(user.id);

    // sending reponse
    res.json({
      token,
      user: {
        id: user.id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        qualification: user.qualification,
        profession: user.profession,
        gender: user.gender,
        register_date: user.register_date,
        interests: user.interests,
        hobbies: user.hobbies,
        description: user.description,
        location: user.location,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ server: { msg: 'internal server error' } });
  }
});

module.exports = router;
