const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });


const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);


const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const eventRoutes = require("./routes/routes");


const server = express();

const secret = process.env.SECRET;

// Middleware
server.use(express.urlencoded({ extended: true }));
server.use(express.json());

// Session setup
server.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: false
}));

// // TEMP: fake login for testing - remove when done
// server.use((req, res, next) => {
//     req.session.userId = req.session.userId || "6571234567890abcdef12345";
//     req.session.userName = req.session.userName || "Test User";
//     req.session.userGender = req.session.userGender || "Male";
//     next();
// });


// Make session user available in all EJS views
server.use((req, res, next) => {
    res.locals.sessionUser = req.session.userId || null;
    res.locals.sessionName = req.session.userName 
        ? (req.session.userGender === "Male" ? "Mr " : "Ms ") + req.session.userName 
        : null;
    next();
});

// View engine
server.set("view engine", "ejs");

// Routes
server.use(eventRoutes);


// Home page
server.get("/", (req, res) => {
    res.redirect("/events");
});

// index.html entry point (required by project spec)
server.get("/index.html", (req, res) => {
    res.redirect("/events");
});

// Logout route
server.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/events');
});

// 404 handler
server.use((req, res) => {
    res.send("Page not found.");
});

// Connect to MongoDB then start server
async function connectDB() {
    try {
        await mongoose.connect(process.env.DB);
        console.log("MongoDB connected successfully");
        console.log("DB string loaded:", process.env.DB ? "YES" : "NO - check config.env path");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
}


function startServer() {
    server.listen(8000, () => {
        console.log("Server running on http://localhost:8000");
    });
}
console.log("DB =", process.env.DB);
connectDB().then(startServer);