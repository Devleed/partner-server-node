const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const hobbiesList = require('./JSON DATA/hobbies-list.json');
const fs = require('fs');

// * environment variables setup
const dotenv = require('dotenv');
dotenv.config();

// * configuring app
const app = express();

// * enabling cors
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, auth-token',
  );
  next();
});

// * port declaration
const port = process.env.PORT || 5000;

// * server startup
const server = app.listen(port, () => console.log(`listening on port ${port}`));

// * setting up socket io
// const io = socketio(server);
// require('./helpers/socketio/socketManager')(io);

// * middlewares
app.use(express.json());

// * setting routes
app.use('/auth', require('./routes/auth'));
app.use('/user', require('./routes/user'));
app.use('/match', require('./routes/match'));
app.use('/message', require('./routes/message'));
app.use('/conversation', require('./routes/coversation'));

// * cloudinary setup
// cloudinary.config({
//   cloud_name: process.env.CLOUD_NAME,
//   api_key: process.env.API_KEY,
//   api_secret: process.env.API_SECRET,
// });

// * mongodb setup
mongoose
  .connect(process.env.MONGO_CONNECTION_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log('database connected'))
  .catch(e => console.log(`error => ${e}`));

// ! checking the environment
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// ! tsteteognign

const data = require('./JSON DATA/MOCK_DATA.json');
const User = require('./models/User');

const QUALIFICATION_LEVELS = [
  'junior student', // class 10 and below
  'senior student', // between class 10 and 12
  'undergraduate', // university student
  'graduated', // graduated
  'masters',
  'phd',
  'mphil',
  'diploma',
];

const findRandomArrElements = () => {
  let arr = [];
  for (let i = 0; i <= 5; i++) {
    let randElem = hobbiesList[Math.floor(Math.random() * hobbiesList.length)];
    if (!arr.find(elem => randElem === elem)) {
      arr.push(randElem);
    } else {
      i--;
    }
  }
  return arr;
};

// * test route
app.get('/', async (req, res) => {
  try {
    let users = data.map(user => {
      user.qualification.qualification_type =
        QUALIFICATION_LEVELS[
          Math.floor(Math.random() * QUALIFICATION_LEVELS.length)
        ];
      user.hobbies = findRandomArrElements();
      return user;
    });

    const response = await User.insertMany(users);

    res.json(response);
  } catch (err) {
    res.send(err);
  }
});
