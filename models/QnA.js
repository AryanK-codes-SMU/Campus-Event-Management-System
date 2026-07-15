const mongoose = require("mongoose");

const qnaSchema = new mongoose.Schema({
  eventId:    { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  question:   { type: String, required: true },
  answer:     { type: String, default: null },
  askedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  createdAt:  { type: Date, default: Date.now }
});

const QnA = mongoose.model("QnA", qnaSchema, "qnas");

// Ask Question
QnA.createQuestion = function(eventId, question, userId) {
  return this.create({
    eventId,
    question,
    askedBy: userId
  });
};


// Answer Question (only organizer)
QnA.answerQuestion = async function(qnaId, answer, userId) {
  const q = await this.findById(qnaId);
  if (!q) return null;

  q.answer = answer;
  q.answeredBy = userId;

  return q.save();
};

//Delete Question (only organizer)
QnA.deleteQuestion = async function(qnaId, userId) {
  const q = await this.findById(qnaId);
  if (!q) return { error: "Question not found" };

  const Event = require("./Event");
  const event = await Event.findById(q.eventId);

  // Only organizer can delete
  if (!event || event.createdBy.toString() !== userId) {
    return { error: "Not authorized" };
  }

  await this.findByIdAndDelete(qnaId);

  return { success: true, eventId: q.eventId };
};

module.exports = QnA;