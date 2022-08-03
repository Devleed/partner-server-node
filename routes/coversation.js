const express = require('express');

const verifyToken = require('../middlewares/verify-token');
const getObjectId = require('../helpers/getObjectId');

const router = express.Router();

// * requiring models
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// ? ======= GET CONVERSATION ROUTE
/**
 * - retrieves conversation
 * - private
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      between: [getObjectId(req.params.id), getObjectId(req.user.id)],
    }).populate('between', 'fullname username dob gender');

    res.json(conversation);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

// ? ======= SEND MESSAGE ROUTE
/**
 * - sends message
 * - private
 */
router.post('/send/:id', verifyToken, async (req, res) => {
  try {
    // update conversation
    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          messages: {
            sentBy: getObjectId(req.user.id),
            textBody: req.body.messageTextBody,
          },
        },
      },
      { new: true },
    ).populate('between', 'fullname username dob gender');

    res.json(conversation);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

module.exports = router;
