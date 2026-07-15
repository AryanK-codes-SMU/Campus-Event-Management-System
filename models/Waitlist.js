const mongoose = require('mongoose')

const waitlistSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    position: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        default: 'waiting'
    },
    notes: {
        type: String,
        default:''
    }

})

const Waitlist = mongoose.model("Waitlist", waitlistSchema,"waitlists");
// CREATE
// create a new waitlist entry
exports.addToWaitlist = function(newEntry) {
  return Waitlist.create(newEntry)
}

// READ
// gets ALL waitlist entries for a specific event
exports.getEventWaitlist = function(eventId) {
  return Waitlist.find({ eventId: eventId })
}

// gets ONE user's waitlist entry for a specific event 
exports.getUserWaitlistEntry = function(eventId, userId) {
  return Waitlist.findOne({ eventId: eventId, userId: userId })
}

// // gets ONE waitlist entry by its own ID -> to find who to promote
// exports.getWaitlistEntry_ById = function(waitlistId) {
//     return Waitlist.findOne({ _id: waitlistId })
// }

// gets the person at position 1 on waitlist -> for auto promotion
exports.findFirst = function(eventId) {
    return Waitlist.findOne({ eventId: eventId, position: 1 })
}


// UPDATE

// changes a person's status from waiting to promoted
exports.promoteEntry = function(waitlistId) {
  return Waitlist.updateOne({ _id: waitlistId }, { status: 'promoted' })
}

// increase position number by 1 when someone cancel RSVP 
exports.updatePosition = function(waitlistId, newPosition) {
    return Waitlist.updateOne({ _id: waitlistId }, { position: newPosition })
}


// DELETE
// deletes a waitlist entry when a user leaves waitlist or gets promoted 
exports.removeFromWaitlist = function(waitlistId) {
  return Waitlist.deleteOne({ _id: waitlistId })
}




