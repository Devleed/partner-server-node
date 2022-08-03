const mongoose = require('mongoose');
const { Schema } = mongoose;

// validator
const arrayLimit = val => {
  return val.length === 2;
};

const conversationSchema = new Schema({
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
  messages: [
    {
      sentBy: {
        type: Schema.Types.ObjectId,
        ref: 'users',
      },
      textBody: String,
    },
  ],
  loyaltyScore: {
    type: Number,
    default: 0,
  },
});

module.exports = Conversation = mongoose.model(
  'conversation',
  conversationSchema,
);
