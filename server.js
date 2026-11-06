
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const app = express();

// ALLOWED FRONTEND ORIGINS
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map(url => url.trim().replace(/\/$/, ""))
    .filter(Boolean)
];

// CORS CONFIGURATION
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error("Not allowed by CORS: " + origin)
    );
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
}));

// BODY PARSERS
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

// HEALTH CHECK
app.get("/api/health", async (req, res) => {
  try {
    await connectDB();

    return res.status(200).json({
      success: true,
      message: "BookBuddy Backend is Running Successfully!",
      database: "Connected",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Health Check Error:", error);

    return res.status(503).json({
      success: false,
      message: "Backend is running but database connection failed",
      database: "Disconnected"
    });
  }
});

// DATABASE MIDDLEWARE
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();

  } catch (error) {
    console.error("Database Error:", error);

    res.status(503).json({
      success: false,
      message: "Database unavailable"
    });
  }
});

// API ROUTES
app.use("/api/users", require("./routes/authRoutes"));
app.use("/api/contact", require("./routes/contact"));
app.use("/api/books", require("./routes/bookRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);

  res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
});

// LOCAL DEVELOPMENT ONLY
if (require.main === module) {
  const http = require("http");
  const { Server } = require("socket.io");
  const setupSocket = require("./socket");

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  setupSocket(io);

  const PORT = process.env.PORT || 3001;

  server.listen(PORT, () => {
    console.log(`BookBuddy running on port ${PORT}`);
  });
}

// VERCEL EXPORT
module.exports = app;
