const Event = require('../models/Event');
const Announcement = require('../models/Announcement');
const QnA = require('../models/QnA');
const Rsvp = require('../models/Rsvp');
const User = require('../models/UserInfo');
const Waitlist = require('../models/Waitlist')

// Get all events with optional filtering, searching, and sorting
exports.getAllEvents = async (req, res) => {
    try {

        // query depends on what is appended to the URL after "?"
        const category = req.query.category;
        const search = req.query.search;
        const sort = req.query.sort || 'date';
        let filter = {};

        // Add category filter if a specific category is selected
        if (category && category !== 'All') {
            filter.category = category;
        }

        // Add title search filter if search term is provided (case-insensitive)
        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
            filter.title = { $regex: escapedSearch, $options: 'i' };
        }

        // Fetch latest announcements for events the logged-in user has RSVP'd to
        let latestAnnouncements = [];         

        if (req.session.userId) {
            const userRsvps = await Rsvp.getRsvpsByUser(
                req.session.userId,
            );

            const eventIds = userRsvps.map(r => r.eventId);  // map loops through array -> returns a NEW array
            // We use map to extract only the eventId field from each RSVP object,
            // so we get an array of just event IDs which can be used for querying announcements.

            
            // Fetch announcements for events the user RSVP’d to,
            // include full event details, 
            // and sort newest first.
            const announcements = await Announcement.find({
                eventId: { $in: eventIds },  // Find announcements where eventId matches ANY value in eventIds array
            })
            .sort({ createdAt: -1 });  // Sort announcements by newest first

            const filteredAnnouncements = announcements.filter(a => 
            !a.isPromotion || a.createdBy.toString() === req.session.userId
            );

            for (const a of filteredAnnouncements) {
                const isRead = a.isReadBy?.includes(req.session.userId);

                if (!isRead) {
                    latestAnnouncements.push({
                        message: a.message,
                        eventId: a.eventId,
                        eventTitle: a.eventTitle,
                        createdAt: a.createdAt,
                        _id: a._id
                    });
                }
            }
        }

        // "new Date()" creates the current date and time.
        // ".toISOString()" converts it to a string like "2026-04-02T16:30:45.123Z"
        // ".split('T')[0]" splits on "T" and takes the first part: "2026-04-02"
        // This gives us today's date in YYYY-MM-DD format for comparison.
        const today = new Date().toISOString().split('T')[0];   // Converts to standard (YYYY-MM-DD) format (eg:- "2026-04-02T16:30:45.123Z")
        filter.date = { $gte: today };  // Only fetch events where date >= today
        // $gte = greater than or equal
        // ...filter.date -> keeps existing conditions and adds a new one


        // Fetch filtered and sorted events from the database
        const events = await Event.retrieveAll(filter, sort);
        const recentEvents = await Event.getRecent(5);

        res.render('events/indexEvent', {
            events,
            recentEvents,
            category: category || 'All',
            search: search || '',
            sort: sort,
            UserRole: req.session.userRole,
            sessionUser: req.session.userId || null,
            sessionName: req.session.userName
                ? (req.session.userGender === "Male" ? "Mr " : "Ms ") + req.session.userName
                : null,
            latestAnnouncements: latestAnnouncements
        });
    } catch (err) {
        console.error(err);
        res.send('Failed to load all events.');
    }
};

// Get a single event by its ID and render the event detail page
exports.getEventById = async (req, res) => {
    try {
        const eventId = req.query.id;
        const event = await Event.findById(eventId);
        if (!event) {
            return res.send('Event not found.');
        }

        // Check if the logged-in user is the event creator
        const isOwner = req.session.userId && event.createdBy.toString() === req.session.userId;
        const UserRole = req.session.userRole
        // Fetch related data for the event detail page
        const announcements = await Announcement.find({ eventId: event._id });
        const qnas = await QnA.find({ eventId: event._id });
        const attendees = await Rsvp.getRsvpsByEvent( event._id );
        const userRsvp = req.session.userId
            ? await Rsvp.getRsvpEntry( req.session.userId, eventId )
            : null
        const userOnWaitlist = req.session.userId
            ? await Waitlist.getUserWaitlistEntry(eventId, req.session.userId)
            : null
        const creator = await User.getUserById(event.createdBy);

        const waitlist = await Waitlist.getEventWaitlist(eventId);
        const currentAttendees = attendees.length;

        res.render('events/showEvent', {
            userOnWaitlist,
            waitlistCount: waitlist.length,
            userRsvp,
            creator,
            event,
            isOwner,
            announcements,
            qnas,
            attendees,
            currentAttendees,
            UserRole,
            sessionUser: req.session.userId,
            sessionName: req.session.userName
                ? (req.session.userGender === "Male" ? "Mr " : "Ms ") + req.session.userName
                : null
        });

    } catch (err) {
        console.error(err);
        res.send('Something went wrong for the showevent.');
    }
};

// Render the new event form
exports.getNewEventForm = (req, res) => {
    res.render('events/newEvent', { error: null, formData: {} });
};

// Handle new event form submission and save to database
exports.createEvent = async (req, res) => {
    try {
        // Extract all fields from the form
        const title = req.body.title;
        const description = req.body.description;
        const date = req.body.date;
        const startTime = req.body.startTime;
        const endTime = req.body.endTime;
        const location = req.body.location;
        const category = req.body.category;
        const maxAttendees = req.body.maxAttendees;
        const imageUrl = req.body.imageUrl || '';

        // Validate that all required fields are filled in
        if (!title || !description || !date || !startTime || !endTime || !location || !category || !maxAttendees) {
            return res.render('events/newEvent', { error: 'All fields are required.', formData: req.body });
        }

        if (endTime <= startTime) {
            return res.render('events/newEvent', { error: 'End time must be after start time.', formData: req.body });
        }

        const existingEvent = await Event.checkDuplicate({ 
            title: title, 
            date: date, 
            startTime: startTime,
            location: location 
        });

        if (existingEvent) {
            return res.render('events/newEvent', { 
                error: 'A duplicate event already exists.', 
                formData: req.body 
            });
        }

        // Build the new event object
        let newEvent = {
            title: title,
            description: description,
            date: date,
            startTime: startTime,
            endTime: endTime,
            location: location,
            category: category,
            maxAttendees: Number(maxAttendees),
            imageUrl: imageUrl,
            createdBy: req.session.userId
        };

        await Event.addEvent(newEvent);
        res.redirect('/events');
        } catch (err) {
            console.error(err);
            res.render('events/newEvent', { error: 'Failed to create event. Please try again.', formData: req.body });
        }
};

// Render the edit event form, pre-filled with existing event data
exports.getEditEventForm = async (req, res) => {
    try {
        const eventId = req.query.id;
        const event = await Event.findById(eventId);
        if (!event) {
            return res.send('Event not found.');
        }

        // Only the event creator is allowed to edit
        if (event.createdBy.toString() !== req.session.userId && req.session.userRole !== "moderator") {
            return res.send('You are not allowed to edit this event.');
        }

        res.render('events/editEvent', { event, error: null });
        } catch (err) {
            console.error(err);
            res.render('events/newEvent', { error: 'Failed to load edit form. Please try again.', formData: req.body });
        }
};

// Handle edit event form submission and update in database
exports.updateEvent = async (req, res) => {
    try {
        const eventId = req.body.id;
        const event = await Event.findById(eventId);
        if (!event) {
            return res.send('Event not found.');
        }

        // Only the event creator is allowed to update
        if (event.createdBy.toString() !== req.session.userId && req.session.userRole !== "moderator") {
            return res.send('You are not allowed to edit this event.');
        }

        // Extract updated fields from the form
        const title = req.body.title;
        const description = req.body.description;
        const date = req.body.date;
        const startTime = req.body.startTime;
        const endTime = req.body.endTime;
        const location = req.body.location;
        const category = req.body.category;
        const maxAttendees = req.body.maxAttendees;
        const imageUrl = req.body.imageUrl || event.imageUrl || '';

        // Patch req.body so event._id is available in the template's hidden input
        const formEvent = {
            _id: eventId,
            title,
            description,
            date,
            startTime,
            endTime,
            location,
            category,
            maxAttendees,
            imageUrl
        };

        // Validate that all required fields are filled in
        if (!title || !description || !date || !startTime || !endTime || !location || !category || !maxAttendees) {
            return res.render('events/editEvent', { 
                event: formEvent,
                error: 'All fields are required.' 
            });
        }

        if (endTime <= startTime) {
            return res.render('events/editEvent', { 
                event: formEvent,
                error: 'End time must be after start time.' 
            });
        }

        if (Number(maxAttendees) < event.maxAttendees) {
            const originalMax = event.maxAttendees;
            event.maxAttendees = Number(maxAttendees); // keep what user typed in the field
            return res.render('events/editEvent', { event, error: `Max attendees cannot be reduced below the original maximum of ${originalMax}.` });
        }

        // Build the updated event object
        let updatedEvent = {
            title: title,
            description: description,
            date: date,
            startTime: startTime,
            endTime: endTime, 
            location: location,
            category: category,
            maxAttendees: Number(maxAttendees),
            imageUrl: imageUrl
        };
        await Event.editEvent(eventId, updatedEvent);

        await Announcement.create({
        message: `Event "${event.title}" has been updated. Please check the latest information.`,
        eventId: eventId,
        eventTitle: event.title,
        createdBy: req.session.userId,
        updatedAt: new Date()
        });

        res.redirect('/events');
    } catch (err) {
        console.error(err);
        res.send('Failed to update event.');
    }
};

// Render the delete confirmation page
exports.getDeleteEventForm = async (req, res) => {
    try {
        const eventId = req.query.id;
        const event = await Event.findById(eventId);
        if (!event) {
            return res.send('Event not found.');
        }

        // Only the event creator is allowed to delete
        if (event.createdBy.toString() !== req.session.userId && req.session.userRole !== "moderator") {
            return res.send('You are not allowed to delete this event.');
        }

        res.render('events/deleteEvent', { event });
    } catch (err) {
        console.error(err);
        res.send('Something went wrong for render delete.');
    }
};

// Handle delete confirmation and remove event from database
exports.deleteEvent = async (req, res) => {
    try {
        const eventId = req.body.id;
        const event = await Event.findById(eventId);
        if (!event) {
            return res.send('Event not found.');
        }

        // Only the event creator is allowed to delete
        if (event.createdBy.toString() !== req.session.userId && req.session.userRole !== "moderator") {
            return res.send('You are not allowed to delete this event.');
        }

        // CREATE ANNOUNCEMENT BEFORE DELETE
        await Announcement.create({
            message: `Event "${event.title}" has been cancelled by the organizer.`,
            eventId: eventId,
            eventTitle: event.title,
            createdBy: req.session.userId,
            updatedAt: new Date()
        });

        // NOW DELETE EVENT
        await Event.deleteEvent(eventId);

        res.redirect('/events');
    } catch (err) {
        console.error(err);
        res.send('Failed to delete event.');
    }
};

// Get only the events created by the currently logged-in user
exports.getMyEvents = async (req, res) => {
    try {
        const category = req.query.category;
        const search = req.query.search;
        const sort = req.query.sort || 'date';

        let filter = { createdBy: req.session.userId };

        if (category && category !== 'All') {
            filter.category = category;
        }

        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.title = { $regex: escapedSearch, $options: 'i' };
        }

        const events = await Event.retrieveAll(filter, sort);

        res.render('events/indexEvent', {
            events,
            recentEvents: [],
            category: category || 'All',
            search: search || '',
            sort: sort,
            UserRole: req.session.userRole,
            sessionUser: req.session.userId || null,
            sessionName: req.session.userName
                ? (req.session.userGender === "Male" ? "Mr " : "Ms ") + req.session.userName
                : null,
            latestAnnouncements: []
        });
    } catch (err) {
        console.error(err);
        res.send('Failed to load my events.');
    }
}

//reports
exports.showReportForm = async (req, res) => {
    try {
        const eventId = req.body.eventId;
        const event = await Event.findById(eventId); // fetch event details if needed
        if (!event) {
            return res.status(404).send("Event not found");
        }
        res.render("events/reports", { event });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};
exports.reportEvent = async (req, res) => {
    const { eventId, reasons } = req.body;

    // Fetch the event to render the form again
    const event = await Event.findById(eventId);

    if (!reasons) {
        return res.render("events/reports", {
            event,
            error: "Please select at least one reason"
        });
    }

    const result = await Event.reportEvent(eventId, req.session.userId, reasons);
    if (result.error) {
        return res.send(result.error);
    }

    res.redirect('/events/show?id=' + eventId);
};

exports.viewReportedEvents = async (req, res) => {

    // restrict to moderator
    if (req.session.userRole !== "moderator") {
        return res.send("Not authorized");
    }

    const events = await Event.getReportedEvents({ reportCount: { $gt: 0 } })
        .sort({ reportCount: -1 });

    res.render("events/reportedEvents", {
        events,
        sessionUser: req.session.userId,
        sessionName: req.session.userName,
        role: req.session.userRole
    });
};

exports.dismissReports = async (req, res) => {

    if (req.session.userRole !== "moderator") {
        return res.send("Not authorized");
    }

    await Event.dismissReports(req.body.eventId);

    res.redirect("/events/reports");
};