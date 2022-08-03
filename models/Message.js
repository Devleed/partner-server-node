const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
  to: { type: Schema.Types.ObjectId, ref: 'users' },
  by: { type: Schema.Types.ObjectId, ref: 'users' },
  textBody: String,
  date: { type: Number, default: Date.now() },
});

module.exports = Message = mongoose.model('messages', messageSchema);
