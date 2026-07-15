const QnA = require('../models/QnA');


// Ask
exports.askQuestion = async (req, res) => {

  if (!req.session.userId) {
    return res.send("Login required");
  }

  await QnA.createQuestion(
    req.body.eventId,
    req.body.question,
    req.session.userId
  );

  res.redirect('/events/show?id=' + req.body.eventId);
};


// Answer
exports.answerQuestion = async (req, res) => {

  if (!req.session.userId) {
    return res.send("Login required");
  }

  const q = await QnA.answerQuestion(
    req.body.qnaId,
    req.body.answer,
    req.session.userId
  );

  if (!q) return res.send("Question not found");

  res.redirect('/events/show?id=' + q.eventId);
};

// Delete
exports.deleteQuestion = async (req, res) => {

  if (!req.session.userId) {
    return res.send("Login required");
  }

  const result = await QnA.deleteQuestion(
    req.body.qnaId,
    req.session.userId
  );
  
  if (result.error) {
    return res.send(result.error);
  }
  res.redirect('/events/show?id=' + result.eventId);
};
