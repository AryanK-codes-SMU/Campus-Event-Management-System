const Announcement = require("../models/Announcement");
const Event = require("../models/Event");

exports.createAnnouncement = async (req, res) => {
  try
  {
    const { message, eventId } = req.body;

    const event = await Event.findById(eventId);

    await Announcement.create({
      message,
      eventId: eventId,
      eventTitle: event.title,
      createdBy: req.session.userId,
      updatedAt: new Date()
    });

    res.redirect(`/events/show?id=${eventId}`);
  }
  catch (err)
  {
    console.log(err);
    res.send("Error creating announcement");
  }
};

exports.updateAnnouncement = async (req, res) => {
  try
  {
    const { announcementId, eventId, message } = req.body;

    await Announcement.updateOne(
      { _id: announcementId },
      { message: message, updatedAt: new Date() }
    );

    res.redirect(`/events/show?id=${eventId}`);
  } 
  catch (err) 
  {
    console.log(err);
    res.send("Error updating announcement");
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try 
  {
    const { announcementId, eventId } = req.body;

    await Announcement.deleteOne({ _id: announcementId });

    res.redirect(`/events/show?id=${eventId}`);
  } 
  catch (err)
  {
    console.log(err);
    res.send("Error deleting announcement");
  }
};

exports.markAsRead = async (req, res) => {
  try
  {
    const { id } = req.body;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.send("Announcement not found");
    }

    if (!announcement.isReadBy.includes(req.session.userId)) {
      announcement.isReadBy.push(req.session.userId);
      await announcement.save();
    }

    res.redirect("/events");
  }
  catch (err)
  {
    console.log(err);
    res.send("Error marking as read");
  }
};
