const mongoose = require('mongoose');
const { Schema } = mongoose;

// validator
const arrayLimit = val => {
  return val.length === 2;
};

const matchSchema = new Schema({
  between: {
    type: [
      {
        type: Schema.Types.ObjectId,
        ref: 'users',
      },
    ],
    required: true,
    validate: [arrayLimit, `{PATH} should have exactly 2 elements`],
  },
  sent_by: {
    type: Schema.Types.ObjectId,
    ref: 'users',
  },
  expired: false,
  expireId: Object,
});

module.exports = Match = mongoose.model('matches', matchSchema);
