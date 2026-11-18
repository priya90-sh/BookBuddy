
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const app = express();

// 1. ALLOWED FRONTEND ORIGINS
const allowedOrigins = [
  "https://book-buddy-frontend-new.vercel.app",
  "https://book-buddy-frontend-rlrcwdjir-priya-6416.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",

  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((url) => url.trim().replace(/\/$/, ""))
    .filter(Boolean)
];

// 2. CORS CONFIGURATION
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("CORS blocked origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// 3. BODY PARSERS
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. ROOT ROUTE
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "BookBuddy Backend is Running!"
  });
});

// 5. HEALTH CHECK
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
      message: "Database connection failed",
      database: "Disconnected",
      error: error.message
    });
  }
});

// 6. DATABASE MIDDLEWARE
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database Connection Error:", error);

    return res.status(503).json({
      success: false,
      message: "Database unavailable",
      error: error.message
    });
  }
});

// 7. API ROUTES
app.use("/api/users", require("./routes/authRoutes"));
app.use("/api/contact", require("./routes/contact"));
app.use("/api/books", require("./routes/bookRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));

// 8. 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

// 9. ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS blocked this origin"
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
});

// 10. LOCAL DEVELOPMENT ONLY - SOCKET.IO
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

// 11. VERCEL EXPORT
module.exports = app;
