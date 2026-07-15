const express = require("express");
const router = express.Router();

const eventController = require('../controllers/eventController');
const authController = require('../controllers/authController');
const announcementController = require('../controllers/announcementController');
const rsvpController = require('../controllers/rsvpController');
const ProfileController = require('../controllers/ProfileController');
const waitlistController = require('../controllers/waitlistController');

const qnaController = require('../controllers/QnAController');


// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
    if (!req.session.userId) {
        console.log("User not logged in, redirecting to /login");
        return res.redirect("/login");
    }
    next();
};

// Event routes
router.get("/events", eventController.getAllEvents);
router.get("/events/new", isLoggedIn, eventController.getNewEventForm);
router.post("/events/new", isLoggedIn, eventController.createEvent);
router.get("/events/show", eventController.getEventById);
router.get("/events/edit", isLoggedIn, eventController.getEditEventForm);
router.post("/events/edit", isLoggedIn, eventController.updateEvent);
router.get("/events/delete", isLoggedIn, eventController.getDeleteEventForm);
router.post("/events/delete", isLoggedIn, eventController.deleteEvent);
router.get('/events/mine', isLoggedIn, eventController.getMyEvents)


// QnA routes
router.post("/events/question", isLoggedIn, qnaController.askQuestion);
router.post("/events/qna/answer", isLoggedIn, qnaController.answerQuestion);
router.post("/events/qna/delete", isLoggedIn, qnaController.deleteQuestion);

// Auth routes
router.get("/register", authController.showRegisterPage);
router.post("/register", authController.registerUser);
router.get("/login", authController.showLogin);
router.post("/login", authController.loginUser);
router.get("/resetPassword", authController.showResetPW);
router.post("/resetPassword", authController.resetPW);
router.get("/t-and-c", authController.showTnC);

// Announcement routes
router.post("/events/announcement", announcementController.createAnnouncement);
router.post("/events/announcement/edit", announcementController.updateAnnouncement);
router.post("/events/announcement/delete", announcementController.deleteAnnouncement);
router.post("/announcements/read", announcementController.markAsRead);

// RSVP routes
router.get("/rsvps", isLoggedIn, rsvpController.getmyRsvp)
router.post("/events/initialrsvp", isLoggedIn, rsvpController.showRsvp);
router.post("/events/rsvp", isLoggedIn, rsvpController.createRsvp);
router.post("/events/rsvp/cancel", isLoggedIn, rsvpController.cancelRsvp);
router.get("/events/attendees", isLoggedIn, rsvpController.getAttendees);

// User routes
router.get('/DisplayProfile', isLoggedIn, ProfileController.getUser);
router.get('/profile/edit', isLoggedIn, ProfileController.showEditProfile);
router.post('/profile/edit', isLoggedIn, ProfileController.updateProfile);

// Waitlist Routes
router.get('/waitlist', isLoggedIn, waitlistController.viewWaitlist);
router.post('/join-waitlist', isLoggedIn, waitlistController.joinWaitlist);
router.post('/leave-waitlist', isLoggedIn, waitlistController.leaveWaitlist);

// Report Routes
router.post("/events/report", isLoggedIn, eventController.reportEvent);
router.post("/events/reports/dismiss", isLoggedIn, eventController.dismissReports);
router.get("/events/reports", isLoggedIn, eventController.viewReportedEvents);
router.post("/events/reports/form", isLoggedIn, eventController.showReportForm);

module.exports = router;
