const mongoose = require('mongoose');
const { Schema } = mongoose;

const MatchScheduler = new Schema(
  {
    _id: Schema.Types.ObjectId,
  },
  { timestamps: true },
);

MatchScheduler.index({ createdAt: 1 }, { expireAfterSeconds: 120 });

module.exports = mongoose.model('matchScheduler', MatchScheduler);
