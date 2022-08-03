const express = require('express');

const getObjectId = require('../helpers/getObjectId');
const verifyToken = require('../middlewares/verify-token');
const qualifications = require('../JSON DATA/qualification-list.json');

const router = express.Router();

// * requiring models
const User = require('../models/User');
const Match = require('../models/Match');
const MatchScheduler = require('../models/MatchScheduler');
const Conversation = require('../models/Conversation');

// * STREAMS
/**
 * stream generated below is to look for any automatic delete expressions on MatchScheduler if this happens it means that a match is expired and it should be deleted, and both users should be updated that they don't have any pending matches.
 */
let deleteOps = {
  $match: {
    operationType: 'delete',
  },
};

const changeStream = MatchScheduler.watch([deleteOps]);

// listener for delete operations on MatchScheduler
changeStream.on('change', async next => {
  try {
    const updatedDoc = await Match.findByIdAndDelete(next.documentKey._id);

    await Promise.all([
      User.findByIdAndUpdate(updatedDoc.between[0], {
        $push: { rejected: getObjectId(updatedDoc.between[1]) },
        has_pending_match: false,
      }),
      User.findByIdAndUpdate(updatedDoc.between[1], {
        $push: { rejected: getObjectId(updatedDoc.between[0]) },
        has_pending_match: false,
      }),
    ]);
  } catch (error) {
    console.log(error);
  }
});

// ? ======= MATCH ROUTE
/**
 * - finds a match
 * - private
 */
router.get('/find', verifyToken, async (req, res) => {
  // check if user has pending match
  if (req.user.has_pending_match) {
    return res.status(403).json({
      msg:
        'you already has a pending match, accept or reject that match to find new matches',
    });
  }
  // check if user is already in conversation with someone
  if (req.user.in_conversation) {
    return res.status(403).json({
      msg:
        "you're not allowed to find matches when you're already in conversation with someone",
    });
  }

  // which gender user is looking for
  const matchGender = req.user.gender === 'Male' ? 'Female' : 'Male';

  // calculating user's age
  const loggedUserAge =
    new Date().getFullYear() - Number(req.user.dob.substr(-4));

  // finding user's qualification level
  const loggedUserQualificationIndex = qualifications.indexOf(
    req.user.qualification.qualification_type,
  );

  // now try finding a match
  try {
    const users = await User.aggregate([
      {
        $set: {
          // find and set age of user looping through
          age: {
            $subtract: [
              new Date().getFullYear(),
              {
                $toInt: {
                  $substr: ['$dob', 6, -4],
                },
              },
            ],
          },
        },
      },
      {
        $set: {
          // find and set age difference b/w logged in user and user looping through
          ageDifference: {
            $abs: {
              $subtract: ['$age', loggedUserAge],
            },
          },
        },
      },
      {
        $match: {
          $and: [
            // user should have opposite gender
            { gender: matchGender },
            // user should be in same country
            { 'location.country': req.user.location.country },
            // user should not have any pending match
            { has_pending_match: false },
            // user should not be in conversation
            { in_conversation: false },
            // user should be at least or atmost 4 years older or younger respectively
            {
              $expr: {
                $lte: ['$ageDifference', 4],
              },
            },
            // checking qualification levels
            {
              $or: [
                // user should be at least or atmost 1 level behind or ahead in qualification
                {
                  'qualification.qualification_type':
                    qualifications[loggedUserQualificationIndex],
                },
                {
                  'qualification.qualification_type':
                    qualifications[loggedUserQualificationIndex - 1],
                },
                {
                  'qualification.qualification_type':
                    qualifications[loggedUserQualificationIndex + 1],
                },
              ],
            },
            {
              $or: [
                // user should not be rejected
                {
                  $expr: {
                    $not: [
                      {
                        $in: [getObjectId(req.user.id), '$rejected'],
                      },
                    ],
                  },
                },
                {
                  $expr: {
                    $not: [
                      {
                        $in: ['$_id', req.user.rejected],
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
      {
        $set: {
          matchScore: {
            $subtract: [
              {
                $add: [
                  0,
                  // ? add location points
                  {
                    $cond: {
                      if: {
                        $eq: ['$location.city', req.user.location.city],
                      },
                      then: 50,
                      else: 0,
                    },
                  },
                  // ? add interests points
                  {
                    $reduce: {
                      input: '$interests',
                      initialValue: 0,
                      in: {
                        $add: [
                          '$$value',
                          {
                            $size: {
                              $filter: {
                                input: req.user.interests,
                                as: 'interest',
                                cond: {
                                  $eq: [
                                    '$$interest.interest_type',
                                    '$$this.interest_type',
                                  ],
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                  // ? add hobbies points
                  {
                    $size: {
                      $setIntersection: ['$hobbies', req.user.hobbies],
                    },
                  },
                  // ? add qualification points
                  {
                    $cond: {
                      if: {
                        $eq: [
                          '$qualification.qualification_type',
                          req.user.qualification.qualification_type,
                        ],
                      },
                      then: 10,
                      else: 0,
                    },
                  },
                  // ? add profession points
                  {
                    $cond: {
                      if: {
                        $eq: [
                          '$profession.profession_type',
                          req.user.profession.profession_type,
                        ],
                      },
                      then: 10,
                      else: 0,
                    },
                  },
                ],
              },
              '$ageDifference',
            ],
          },
        },
      },
      { $sort: { matchScore: -1 } },
      {
        $project: {
          profession: 1,
          qualification: 1,
          matchScore: 1,
          fullname: 1,
          dob: 1,
        },
      },
    ]);

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send('internal server error');
  }
});

// ? ======= MATCH ACCEPTANCE ROUTE
/**
 * - accepts a match
 * - private
 */
router.put('/accept/:id', verifyToken, async (req, res) => {
  // what fields of user to return
  const selectString = 'in_conversation fullname username dob gender';
  try {
    if (req.user.rejected.find(id => id.equals(getObjectId(req.params.id)))) {
      return res.json({
        msg: "you're trying to match with a rejected user",
      });
    }

    // check if match exists
    // if match exists it means that both users have accepted the match so match should be deleted
    const existingMatch = await Match.findOneAndDelete({
      between: {
        $in: [getObjectId(req.params.id), getObjectId(req.user.id)],
      },
    });

    if (existingMatch) {
      // if there's an existing match

      // if somehow the user which already accepted the match tries to accept again
      // ! very rare case
      if (existingMatch.sent_by.equals(req.user.id)) {
        // then create the match again and alert user
        await new Match({
          _id: existingMatch.id,
          between: existingMatch.between,
          sent_by: existingMatch.sent_by,
        }).save();
        return res
          .status(403)
          .json({ msg: 'you have already accepted the match' });
      }

      // delete the match scheduler
      await MatchScheduler.findByIdAndDelete(existingMatch.id);

      const [conversation, matchedUser, loggedInUser] = await Promise.all([
        // create new conversation
        new Conversation({
          between: [getObjectId(req.params.id), getObjectId(req.user.id)],
        }).save(),
        // update both user's in_conversation to true
        User.findByIdAndUpdate(
          req.params.id,
          { has_pending_match: false, in_conversation: true },
          { new: true },
        ).select(selectString),
        User.findByIdAndUpdate(
          req.user.id,
          { has_pending_match: false, in_conversation: true },
          { new: true },
        ).select(selectString),
      ]);
      res.json({ conversation, matchedUser, loggedInUser });
    } else {
      // send match request to alternate user
      /**
       * - see if users online
       * -- if yes then send socket that you have a pending match
       */
      const [match, matchedUser, loggedInUser] = await Promise.all([
        // create a new match
        new Match({
          between: [getObjectId(req.params.id), getObjectId(req.user.id)],
          sent_by: getObjectId(req.user.id),
        }).save(),
        // set has_pending_match to true for both users
        User.findByIdAndUpdate(
          req.params.id,
          { has_pending_match: true },
          { new: true },
        ).select(selectString),
        User.findByIdAndUpdate(
          req.user.id,
          { has_pending_match: true },
          { new: true },
        ).select(selectString),
      ]);

      await new MatchScheduler({
        _id: match.id,
      }).save();

      res.json({ match, matchedUser, loggedInUser });
    }
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

// ? ======= MATCH REJECTION ROUTE
/**
 * - rejects a match
 * - private
 */
router.put('/reject/:id', verifyToken, async (req, res) => {
  const selectString = 'in_conversation fullname username dob gender';
  try {
    if (req.user.rejected.find(id => id.equals(getObjectId(req.params.id)))) {
      return res.json({
        msg: "you're trying to reject with an already rejected user",
      });
    }

    // add users to the rejected arrays
    const [existingMatch, matchedUser, loggedInUser] = await Promise.all([
      Match.findOneAndDelete({
        between: {
          $in: [getObjectId(req.params.id), getObjectId(req.user.id)],
        },
      }),
      User.findByIdAndUpdate(
        req.params.id,
        {
          $push: { rejected: getObjectId(req.user.id) },
          has_pending_match: false,
        },
        { new: true },
      ).select(selectString),
      User.findByIdAndUpdate(
        req.user.id,
        {
          $push: { rejected: getObjectId(req.params.id) },
          has_pending_match: false,
        },
        { new: true },
      ).select(selectString),
    ]);

    await MatchScheduler.findByIdAndDelete(existingMatch.id);

    res.json({ existingMatch, matchedUser, loggedInUser });
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

// ? ======= GET PENDING MATCH ROUTE
/**
 * - return a pending match
 * - private
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const pendingMatch = await Match.findOne({
      between: {
        $in: [getObjectId(req.user.id)],
      },
    });

    if (!pendingMatch) {
      return res.json({
        msg: 'your match was rejected, try finding a new one',
      });
    }

    res.json({
      match: pendingMatch,
      sent_by_you: pendingMatch.sent_by.equals(req.user.id),
    });
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

// ! TESTING MATCH ROUTES
router.put('/create/:id', verifyToken, async (req, res) => {
  try {
    // check if match exists
    const response = await new Match({
      between: [getObjectId(req.user.id), getObjectId(req.params.id)],
      sent_by: req.user.id,
    }).save();

    await new MatchScheduler({
      _id: response.id,
    }).save();

    res.json(response);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

// ! TESTING MATCH ROUTES
router.delete('/delete/:id', async (req, res) => {
  try {
    // check if match exists
    const response = await Match.findByIdAndDelete(req.params.id);

    await MatchScheduler.findByIdAndDelete(response.id);

    res.json(response);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

module.exports = router;

/**
 * test 2 token
 * eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVmYzY5YmM3ZjFlMDFmM2Y1NGEyMGNiYyIsImlhdCI6MTYwNjg1MTUyOH0.lbLCqIyC38dw8LESWnAiIUgaOVDolhFY2wrOsBMlo78
 */

/**
 * test 1 token
 * eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVmYzY5YmJlZjFlMDFmM2Y1NGEyMGNiYiIsImlhdCI6MTYwNjg5NDM2NX0.evIfdZ_i7RXJtSBi4OpX6asUA2h78jX1gBRs7-ad0q8
 */
