const Event = require("../models/Event");
const Rsvp = require("../models/Rsvp");
const UserInformation = require("../models/UserInfo");
const Waitlist= require('../models/Waitlist')
const Announcement = require('../models/Announcement')
const mongoose = require('mongoose')

//let users see which events did they RSVP to (READ)
exports.getmyRsvp = async (req,res) =>{
  try{
  const userId = req.session.userId;
  if (!userId) return res.redirect("/login");

  const rsvps = await Rsvp.getRsvpsByUser(userId);

  const rsvpList = [];
  for (const rsvp of rsvps) {
    const event = await Event.findById(rsvp.eventId); //findById returns the matching document or null if unable to find
    if (!event) continue;
    rsvpList.push({note: rsvp.note, eventId: event});
  }
  res.render("rsvp/my-rsvp", {rsvps: rsvpList, sessionUser: req.session.userId, sessionName: req.session.userName});
} catch (error) {
  console.log(error);
  res.send("Something went wrong.");
}
}

//Shows the initial RSVP page when users want to RSVP or see their RSVP page (READ)
exports.showRsvp = async (req,res) =>{
  try{
  const eventId = req.body.eventId;
  const userId = req.session.userId;
  const event = await Event.findById(eventId);
  const userRsvp = await Rsvp.getRsvpEntry(userId, eventId);
  const attendees = await Rsvp.getRsvpsByEvent(eventId);
  
  res.render('rsvp/attendees', {event, attendees, showAttendees: false, error:null, userRsvp, justRsvp: false, clashingEvent: null});
  } catch (error){
  console.log(error);
  res.send("Something went wrong.");
}}

//Lets users RSVP to events (CREATE)
exports.createRsvp = async (req, res) => {
  try {
    const eventId = req.body.eventId;
    const userId = req.session.userId;
    const event = await Event.findById(eventId);
    const attendees = await Rsvp.getRsvpsByEvent(eventId);
    
    //Validating users to ensure they only can RSVP if they pass the conditions below.
    const existing = await Rsvp.getRsvpEntry(userId, eventId);
    if (existing) return res.render("rsvp/attendees", {event, attendees, showAttendees: false, error:`You have already RSVP'ed to the event.`, userRsvp: existing, justRsvp: false});
    if (attendees.length >= event.maxAttendees) return res.render("rsvp/attendees", {event, attendees, showAttendees: false, error:`Sorry, this event is full.`, userRsvp: null, justRsvp: false});
    if (String(event.createdBy) === req.session.userId) return res.render("rsvp/attendees", {event, attendees, showAttendees: false, error:`You cannot RSVP to your own event.`,userRsvp: null, justRsvp: false});
      
      // converting to minutes 
      function toMinutes(timeStr) {
          const [h, m] = timeStr.split(':').map(Number);
          return h * 60 + m;
      }

      function isClash(event1, event2) {
          // if dates diff -> wont clash
          if (event1.date !== event2.date) return false;
          // if timefield empty, can't check for clash -> skip
          if (!event1.startTime || !event1.endTime || !event2.startTime || !event2.endTime) return false;
          // convert all 4 timings (start time and end time for 2 events) into minutes to compare
          const start1 = toMinutes(event1.startTime);
          const end1   = toMinutes(event1.endTime);
          const start2 = toMinutes(event2.startTime);
          const end2   = toMinutes(event2.endTime);
          // event 1 starts before event 2 ends AND event 2 starts before event 1 ends 
          return start1 < end2 && start2 < end1;
      }

      const existingRsvps = await Rsvp.getRsvpsByUser(userId);
      let clashingEvent = null;
      for (const rsvp of existingRsvps) {
          const existingEvent = await Event.findById(rsvp.eventId);
          if (!existingEvent) continue;
          if (isClash(event, existingEvent)) {
              clashingEvent = existingEvent;
              break;
          }
      }

      if (clashingEvent) {
          return res.render("rsvp/attendees", {
              event, attendees,  showAttendees: false,
              error: `Time clash! You already have a RSVP for ${clashingEvent.title} during the same timeslot. Cancel it first before RSVPing to this event.`,
              userRsvp: null,
              justRsvp: false,
              clashingEvent: clashingEvent
          });
      }
    const newRsvp = await Rsvp.createRsvp({ userId, eventId, note: req.body.note });
    await Event.updateEvent(eventId, { currentAttendees: attendees.length + 1 });
    const updatedAttendees = await Rsvp.getRsvpsByEvent(eventId);

    res.render("rsvp/attendees", {event, attendees:updatedAttendees, showAttendees: false, error:null, userRsvp: newRsvp, justRsvp: true, clashingEvent: null})
  } catch (err) {
    console.log(err);
    res.send("Something went wrong.");
  }
};

//Let users delete their RSVP if they do not want to go to the event. (DELETE)
exports.cancelRsvp = async (req, res) => {
  try {
    const eventId = req.body.eventId;
    const userId = req.session.userId;
    const event = await Event.findById(eventId);
    const attendees = await Rsvp.getRsvpsByEvent(eventId);
    const rsvp = await Rsvp.getRsvpEntry(userId, eventId);

    if (!rsvp) return res.render("rsvp/attendees", { event, attendees,  showAttendees: false, error: `RSVP not found`, userRsvp: null, justRsvp: false});

    await Rsvp.deleteRsvp(rsvp._id.toString());

    // gets the waitlist entry of the user at position 1 of the event 
    const firstInLine = await Waitlist.findFirst(eventId)

    // if there is someone at 1st position
    if (firstInLine) {

        // create RSVP for the first person on waitlist - AUTO PROMOTION
        await Rsvp.createRsvp({ userId: firstInLine.userId, eventId: eventId })
        // promoted person is removed from waitlist 
        await Waitlist.removeFromWaitlist(firstInLine._id.toString())
        await Event.updateEvent(eventId, { currentAttendees: event.currentAttendees });
        // get remaining waitlist
        const remaining = await Waitlist.getEventWaitlist(eventId)

        // create a promotion announcement so that the promoted user knows they got a slot 
        await Announcement.create({
          eventId: new mongoose.Types.ObjectId(eventId),
          eventTitle: event.title,
          message: `A slot opened up for you! You have been added to ${event.title}.`,
          isPromotion: true,
          createdBy: new mongoose.Types.ObjectId(firstInLine.userId),
          updatedAt: new Date()
    })
        // shifts everyone's position in waitlist down by 1 
        for (const item of remaining) {
                await Waitlist.updatePosition(item._id.toString(), item.position - 1)
            }
        } else {
        // no one on waitlist -> decrease currentAttendees since theres one more empty slot 
        await Event.updateEvent(eventId, { currentAttendees: event.currentAttendees - 1 })
    }

    res.redirect(`/events/show?id=${eventId}`);
  } catch (err) {
    console.log(err);
    res.send("Something went wrong.");
  }
};

//Let users see who is going for the event, updated with the waitlist if someone leaves the event.
//Also let event owners see who is attending their events too. (READ)
exports.getAttendees = async (req, res) => {
  try {
    const eventId = req.query.eventId;
    const event = await Event.findById(eventId);
    const attendees = await Rsvp.getRsvpsByEvent(eventId);

    if (!event) return res.redirect("/events");

    const attendlist = [];
    for (const attendee of attendees) {
      const user = await UserInformation.findById(attendee.userId);
      if (!user) continue
      attendlist.push({ firstName: user.firstName, lastName: user.lastName, note: attendee.note });
    }

    const isOwner = event.createdBy.toString() === req.session.userId;
    const userRsvp = await Rsvp.getRsvpEntry( req.session.userId, eventId );
    if (isOwner){
      res.render("rsvp/owner_attendees",{event, attendees: attendlist, sessionUser: req.session.userId, sessionName: req.session.userName})
    } else {
     res.render("rsvp/attendees", { event, attendees: attendlist,  showAttendees: true, error: null, userRsvp , justRsvp: false});
    }
  } catch (err) {
    console.log(err);
    res.send("Something went wrong.");
  }
};

