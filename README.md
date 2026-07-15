# Campus Event Board

A web application for SMU students to discover, create, and manage campus events.

## Features

- View all latest events published by users
- Create, edit, delete and report events
- RSVP to join events
- Waitlist system when events are full — automatic promotion when a slot opens up
- Clash detection — warns users if two RSVPed events overlap in timing
- Announcements — Event organizers can post updates, and attendees receive notifications.
- Q&A — attendees can ask questions, organizers can answer
- Moderator role — can delete any event and manage reported events
- User profile — view and edit personal information
- Password reset via security question


## My Contributions

My primary contributions to this project included:

- Designed and implemented the announcement system for event organizers.

- Built backend APIs for creating, editing, and displaying announcements.

- Implemented attendee notification workflows for event updates and cancellations.

- Developed the automatic waitlist promotion feature.

- Contributed to backend development using Node.js, Express.js, and MongoDB.
  

## Project Structure

```
WAD-Proj/
├── controllers/
│   ├── announcementController.js
│   ├── authController.js
│   ├── eventController.js
│   ├── ProfileController.js
│   ├── QnAController.js
│   ├── rsvpController.js
│   └── waitlistController.js
├── models/
│   ├── Announcement.js
│   ├── Event.js
│   ├── QnA.js
│   ├── Rsvp.js
│   ├── UserInfo.js
│   └── Waitlist.js
├── routes/
│   └── routes.js (includes middleware)
├── views/
│   ├── auth/
│   ├── events/
│   ├── profile/
│   ├── rsvp/
│   └── waitlist/
├── server.js
└── config.env
```

## Prerequisites

- Node.js
- MongoDB

## Installation

1. Install dependencies
```
npm install
```

2. Set up your `config.env` file with your MongoDB connection string and session secret
```
DB=mongodb+srv://admin:abc321@proj.rq4vfqp.mongodb.net/ProjectDatabase?retryWrites=true&w=majority
SECRET="uhfehfeifowhefondwdowqjqjwnqcoienewkn21653gehejwsdjcskdnfns"
```

## Running the App

```
nodemon server.js
```

The server runs on **http://localhost:8000**

## Moderator Account

A moderator account is pre-configured with the following credentials:

| Field | Value |
|---|---|
| Email | admin@smu.edu.sg |
| Password | Admin123! |
| Security Question | What is your favourite food? |
| Security Answer | meat |

Moderators can access the **Report Events** dashboard, delete any event, and dismiss reports.


---

## Acknowledgements

This project was developed as part of the **SMU Web Application Development 1** module.

This repository is maintained to showcase **my contributions** to the project. Credit goes to all team members for their contributions to the overall system.
