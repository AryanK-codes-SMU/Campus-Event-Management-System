const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    title:        { type: String, required: true },
    description:  { type: String, required: true },
    date:         { type: String, required: true },
    startTime:    { type: String, default:'' },
    endTime:      { type: String, default:'' },
    location:     { type: String, required: true },
    category:     { type: String, required: true },
    maxAttendees: { type: Number, required: true },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt:    { type: Date, default: Date.now },
    currentAttendees: { type: Number, default: 0 },
    imageUrl: { type: String, default: '' },
    reportCount: { type: Number, default: 0 },
    reportedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reportReasons: [{reason: String, count: { type: Number, default: 0 }}
]
});

const Event = mongoose.model("Event", eventSchema, "events");

exports.retrieveAll = function(filter, sort) {
    const sortOption = sort === 'newest' ? { createdAt: -1 } : { date: 1 };
    return Event.find(filter).sort(sortOption);
};

exports.getRecent = function(limit) {
    return Event.find().sort({ createdAt: -1 }).limit(limit);
};

exports.findById = function(id) {
    return Event.findOne({ _id: id });
};

exports.addEvent = function(newEvent) {
    return Event.create(newEvent);
};

exports.editEvent = function(id, updatedEvent) {
    return Event.updateOne({ _id: id }, updatedEvent);
};

exports.deleteEvent = function(id) {
    return Event.deleteOne({ _id: id });
};

exports.updateEvent = function(id, updatedFields) {
    return Event.findByIdAndUpdate(id, updatedFields);
};

exports.checkDuplicate = function(filter) {
    const today = new Date().toISOString().split('T')[0];
    return Event.findOne({
        title: filter.title,
        date: { 
            $gte: today,  // only check against future/current events
            $eq: filter.date  // that match the exact date being created
        },
        startTime: filter.startTime,
        location: filter.location
    });
};

//report system
exports.reportEvent = async function(eventId, userId, reasons) {
    const event = await Event.findById(eventId);

    if (!event) return { error: "Event not found" };

    if (event.reportedUsers.includes(userId)) {
        return { error: "Already reported" };
    }

    // ensure reasons is array
    const reasonList = Array.isArray(reasons) ? reasons : [reasons];

    // update counts
    reasonList.forEach(r => {
        const existing = event.reportReasons.find(x => x.reason === r);

        if (existing) {
            existing.count += 1;
        } else {
            event.reportReasons.push({ reason: r, count: 1 });
        }
    });

    event.reportCount += 1;
    event.reportedUsers.push(userId);

    await event.save();

    return { success: true };
};

exports.dismissReports = (id) =>
  Event.findByIdAndUpdate(id, {
    reportCount: 0,
    reportedUsers: [],
    reportReasons: []
  });

exports.getReportedEvents = function() {
    return Event.find({ reportCount: { $gt: 0 } })
        .sort({ reportCount: -1 });
};