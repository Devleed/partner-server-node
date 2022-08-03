const express = require('express');

const verifyToken = require('../middlewares/verify-token');
const getObjectId = require('../helpers/getObjectId');

const router = express.Router();

// * requiring models
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// ? ======= SEND MESSAGE ROUTE
/**
 * - sends message
 * - private
 */
router.post('/send/:id', verifyToken, async (req, res) => {
  try {
    // create message
    const message = await new Message({
      by: getObjectId(req.user.id),
      to: getObjectId(req.params.id),
      textBody: req.body.messageTextBody,
    }).save();

    // update conversation
    const conversation = await Conversation.findOneAndUpdate(
      { between: [getObjectId(req.params.id), getObjectId(req.user.id)] },
      { $push: { messages: getObjectId(message.id) } },
      { new: true },
    );

    res.json({ message, conversation });
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

module.exports = router;
