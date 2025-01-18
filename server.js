require("dotenv").config({ path: "./.env" });
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
const { isAuthenticated } = require("./src/middleware/auth");
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:
        "mongodb+srv://hasnainmakada:hasnain123@cluster0.x0x9i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
      ttl: 24 * 60 * 60,
      crypto: {
        secret:
          "5d35c4cf8923cce689a3a11087ad0ce65512c7b821810813b6611c8dfc42875dfe7fd41c411c6d81261b981846f688fabb35bf11cf8b59324d14b878c7f5b5b6",
      },
    }),
    cookie: {
      secure: "development" === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "strict",
    },
  })
);

// Database connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Import models
const Resource = require("./src/models/resource");
const Admin = require("./src/models/admin");

// Routes
app.get("/", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "resource_fill.html"));
});

app.get("/login", (req, res) => {
  if (req.session.isAuthenticated) {
    res.redirect("/");
  } else {
    res.sendFile(path.join(__dirname, "public", "login.html"));
  }
});

// Login route
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

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

    const isValid = await admin.comparePassword(password);
    if (!isValid) {
      incrementLoginAttempts(req);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    req.session.isAuthenticated = true;
    req.session.username = admin.username;
    req.session.userAgent = req.headers["user-agent"];
    req.session.lastActivity = Date.now();

    res.json({ message: "Login successful", redirect: "/" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Logout route
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Error logging out" });
    }
    res.json({ message: "Logout successful" });
  });
});

// Resource routes
app.post("/api/post-resources", isAuthenticated, async (req, res) => {
  try {
    const formData = req.body;
    formData.toolRelatedTo =
      formData.toolRelatedTo.charAt(0).toUpperCase() +
      formData.toolRelatedTo.slice(1);
    const resource = new Resource(formData);
    await resource.save();
    res.json({ message: "Resource posted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving resource" });
  }
});

app.get("/api/get-resources", async (req, res) => {
  try {
    const resources = await Resource.find();
    res.json(resources);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching resources" });
  }
});

function incrementLoginAttempts(req) {
  req.session.loginAttempts = (req.session.loginAttempts || 0) + 1;
  if (req.session.loginAttempts >= 5) {
    req.session.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lock
  }
}

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on port ${port}`));
