const mongoose = require("mongoose");

const rsvpSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    eventId: {type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true},
    note: {type: String, default:""},
    createdAt: {type: Date, default: Date.now}

});

const Rsvp = mongoose.model("Rsvp", rsvpSchema, "rsvps");
exports.getRsvpsByUser = function(userId) {
    return Rsvp.find({ userId: userId });
};

exports.getRsvpsByEvent = function(eventId) {
    return Rsvp.find({ eventId: eventId });
};

exports.getRsvpEntry = function(userId, eventId) {
    return Rsvp.findOne({ userId: userId, eventId: eventId });
};

exports.createRsvp = function(newRsvp) {
    return Rsvp.create(newRsvp);
};

exports.deleteRsvp = function(rsvpId) {
    return Rsvp.deleteOne({ _id: rsvpId });
};