const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
const { isAuthenticated } = require("./src/middleware/auth");
const app = express();

// Environment variables
const NODE_ENV = process.env.NODE_ENV || "development";
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://hasnainmakada:hasnain123@cluster0.x0x9i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "5d35c4cf8923cce689a3a11087ad0ce65512c7b821810813b6611c8dfc42875dfe7fd41c411c6d81261b981846f688fabb35bf11cf8b59324d14b878c7f5b5b6";

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Ensure CORS is properly set for Render deployment
app.use((req, res, next) => {
  const allowedOrigins = [
    "http://localhost:5000",
    "https://codeflow-api.onrender.com",
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// Session configuration - FIXED for production
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      ttl: 24 * 60 * 60,
      crypto: {
        secret: SESSION_SECRET,
      },
      autoRemove: "native",
      touchAfter: 24 * 3600,
    }),
    cookie: {
      secure: NODE_ENV === "production", // true in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: NODE_ENV === "production" ? "none" : "strict", // Important for cross-site cookies
    },
    proxy: NODE_ENV === "production", // Trust the reverse proxy in production
  })
);

// Static files - after session to ensure session is set up first
app.use(express.static(path.join(__dirname, "public")));

// Database connection with retry logic
const connectWithRetry = () => {
  console.log("MongoDB connection with retry");
  return mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
  console.log("Retrying in 5 seconds...");
  setTimeout(connectWithRetry, 5000);
});

mongoose.connection.once("open", () => {
  console.log("MongoDB connected successfully");
});

connectWithRetry();

// Import models
const Resource = require("./src/models/resource");
const Admin = require("./src/models/admin");

// Health check endpoint for Render
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    environment: NODE_ENV,
    authenticated: req.session.isAuthenticated || false,
  });
});

// Debug endpoint
app.get("/debug-session", (req, res) => {
  res.json({
    sessionID: req.sessionID,
    isAuthenticated: req.session.isAuthenticated || false,
    username: req.session.username || "none",
    cookieSettings: app.get("trust proxy"),
  });
});

// Routes
app.get(
  "/",
  (req, res, next) => {
    console.log("/ route accessed, auth status:", req.session.isAuthenticated);
    if (!req.session.isAuthenticated) {
      return res.redirect("/login");
    }
    next();
  },
  (req, res) => {
    // Use try-catch to handle potential file system errors
    try {
      const filePath = path.join(__dirname, "public", "resource_fill.html");
      if (!require("fs").existsSync(filePath)) {
        console.error("File not found:", filePath);
        return res.status(404).send("Resource file not found");
      }
      res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving resource_fill.html:", error);
      res.status(500).send("Server error when serving the file");
    }
  }
);

app.get("/login", (req, res) => {
  console.log(
    "/login route accessed, auth status:",
    req.session.isAuthenticated
  );
  if (req.session.isAuthenticated) {
    return res.redirect("/");
  }

  // Use try-catch to handle potential file system errors
  try {
    const filePath = path.join(__dirname, "public", "login.html");
    if (!require("fs").existsSync(filePath)) {
      console.error("File not found:", filePath);
      return res.status(404).send("Login file not found");
    }
    res.sendFile(filePath);
  } catch (error) {
    console.error("Error serving login.html:", error);
    res.status(500).send("Server error when serving the file");
  }
});

// Login route - FIXED
app.post("/api/login", async (req, res) => {
  try {
    console.log("Login attempt:", req.body.username);
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password required" });
    }

    if (req.session.loginAttempts && req.session.loginAttempts > 5) {
      const timeLeft = (req.session.lockUntil - Date.now()) / 1000;
      if (timeLeft > 0) {
        return res.status(429).json({
          message: `Too many attempts. Try again in ${Math.ceil(
            timeLeft
          )} seconds`,
        });
      }
      req.session.loginAttempts = 0;
      req.session.lockUntil = null;
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      incrementLoginAttempts(req);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Use the comparePassword method if it exists, otherwise use bcrypt directly
    let isValid;
    if (typeof admin.comparePassword === "function") {
      isValid = await admin.comparePassword(password);
    } else {
      const bcrypt = require("bcryptjs");
      isValid = await bcrypt.compare(password, admin.password);
    }

    if (!isValid) {
      incrementLoginAttempts(req);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Set session properties - IMPORTANT!
    req.session.isAuthenticated = true;
    req.session.username = admin.username;
    req.session.userAgent = req.headers["user-agent"];
    req.session.lastActivity = Date.now();

    // Save session explicitly before responding
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Error saving session" });
      }

      console.log("Login successful for:", admin.username);
      console.log("Session ID:", req.sessionID);
      console.log("Auth status after login:", req.session.isAuthenticated);

      return res.json({
        message: "Login successful",
        redirect: "/",
        sessionID: req.sessionID,
        authStatus: true,
      });
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
});

// Logout route - FIXED
app.post("/api/logout", (req, res) => {
  console.log("Logout attempt for:", req.session.username);

  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Error logging out" });
    }
    res.clearCookie("connect.sid"); // Clear the session cookie
    return res.json({ message: "Logout successful" });
  });
});

// Resource routes
app.post("/api/post-resources", isAuthenticated, async (req, res) => {
  try {
    const formData = req.body;
    if (formData.toolRelatedTo) {
      formData.toolRelatedTo =
        formData.toolRelatedTo.charAt(0).toUpperCase() +
        formData.toolRelatedTo.slice(1);
    }

    // Convert the checkbox value to boolean
    formData.isPaid = formData.isPaid === "on" || formData.isPaid === true;

    // Only include price if isPaid is true
    if (!formData.isPaid) {
      formData.price = "";
    }

    const resource = new Resource(formData);
    await resource.save();
    return res.json({ message: "Resource posted successfully" });
  } catch (error) {
    console.error("Error saving resource:", error);
    return res.status(500).json({ message: "Error saving resource" });
  }
});
app.get("/api/get-resources", async (req, res) => {
  try {
    const resources = await Resource.find().sort({ createdAt: -1 });
    return res.json(resources);
  } catch (error) {
    console.error("Error fetching resources:", error);
    return res.status(500).json({ message: "Error fetching resources" });
  }
});

function incrementLoginAttempts(req) {
  req.session.loginAttempts = (req.session.loginAttempts || 0) + 1;
  if (req.session.loginAttempts >= 5) {
    req.session.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lock
  }
}

// CRITICAL: Trust the proxy when running in production (such as on Render)
if (NODE_ENV === "production") {
  app.set("trust proxy", 1);
  console.log("Trust proxy enabled for production");
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// Handle 404s
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.path}`);
  res.status(404).json({ message: "Route not found" });
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port} in ${NODE_ENV} mode`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  mongoose.connection.close(() => {
    console.log("MongoDB connection closed");
    process.exit(0);
  });
});
