const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  fullname: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: true,
  },
  location: {
    lat: Number,
    long: Number,
    city: String,
    country: String,
  },
  dob: { type: String, required: true },
  gender: { type: String, required: true },
  qualification: {
    qualification_type: String,
    institute: String,
  },
  profession: {
    profession_type: String,
    organization: String,
  },
  hobbies: [String],
  interests: [{ interest_type: String, favourites: [] }],
  description: String,
  register_date: {
    type: Number,
    default: Date.now(),
  },
  in_conversation: {
    type: Boolean,
    default: false,
  },
  has_pending_match: {
    type: Boolean,
    default: false,
  },
  rejected: [
    {
      type: Schema.Types.ObjectId,
      ref: 'users',
    },
  ],
});

module.exports = User = mongoose.model('users', userSchema);
