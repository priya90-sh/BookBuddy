
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const setupSocket = require("./socket");

const app = express();

// FRONTEND URLS ALLOWED TO ACCESS BACKEND
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map(url => url.trim())
    .filter(Boolean)
];

// CORS CONFIGURATION
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS: " + origin));
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS"
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization"
  ]
};

// MIDDLEWARES
app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({
  extended: true,
  limit: "10mb"
}));

// ROOT ROUTE
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BookBuddy Backend is Running!"
  });
});

// HEALTH CHECK ROUTE
app.get("/api/health", async (req, res) => {
  try {
    await connectDB();

    res.status(200).json({
      success: true,
      message: "BookBuddy Backend is Running Successfully!",
      database: "Connected",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Health Check Error:", error.message);

    res.status(503).json({
      success: false,
      message: "Backend is running but database connection failed",
      database: "Disconnected"
    });
  }
});

// CONNECT DATABASE BEFORE API REQUESTS
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database Connection Error:", error.message);

    res.status(503).json({
      success: false,
      message: "Database unavailable"
    });
  }
});

// EXISTING API ROUTES
app.use("/api/users", require("./routes/authRoutes"));

app.use("/api/contact", require("./routes/contact"));

app.use("/api/books", require("./routes/bookRoutes"));

app.use("/api/chat", require("./routes/chatRoutes"));

// HTTP SERVER
const server = http.createServer(app);

// SOCKET.IO CONFIGURATION
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

setupSocket(io);

// ERROR HANDLING
app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);

  res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
});

// START SERVER
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`BookBuddy running on port ${PORT}`);
});

// EXPORT SERVER FOR VERCEL
module.exports = server;
