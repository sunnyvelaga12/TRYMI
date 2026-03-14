import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import nodemailer from "nodemailer";
import "dotenv/config";
import { dirname } from "path";
import { fileURLToPath } from "url";
import Groq from "groq-sdk";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";

// Import Models
import { User } from "./models/User.js";
import { Product } from "./models/Product.js";
import { StudioPhoto } from "./models/StudioPhoto.js";
import { TryOnResult } from "./models/TryOnResult.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_BASE_PATH = path.join(__dirname, "../uploads");

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || process.env.AI_SERVICE_URL || "http://localhost:5001";
console.log(`🤖 AI Service URL: ${PYTHON_AI_URL}`);

// ============================================================
// ✅ BASE64 → FILE HELPER (FOR WISHLIST TRY-ON)
// ============================================================

const saveBase64Image = (base64String) => {
  const match = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return null;

  const ext = match[1];
  const data = match[2];
  const buffer = Buffer.from(data, "base64");

  const dir = path.join(UPLOADS_BASE_PATH, "wishlist");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filename = `wishlist_${Date.now()}.${ext}`;
  const filePath = path.join(dir, filename);

  fs.writeFileSync(filePath, buffer);
  return `/uploads/wishlist/${filename}`; // IMPORTANT: return public path
};

const app = express();
const port = process.env.PORT || 3000;

// ============================================================
// ✅ CREATE UPLOAD DIRECTORIES
// ============================================================

const createUploadDirs = () => {
  const dirs = [
    UPLOADS_BASE_PATH,
    path.join(UPLOADS_BASE_PATH, "studio-photos"),
    path.join(UPLOADS_BASE_PATH, "tryon-results"),
    path.join(UPLOADS_BASE_PATH, "wishlist"),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      } catch (err) {
        console.error(`❌ Failed to create directory ${dir}:`, err.message);
      }
    }
  });
};

createUploadDirs();

// ============================================================
// ✅ CORS CONFIGURATION
// ============================================================

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
      ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ============================================================
// ✅ REQUEST LOGGING MIDDLEWARE
// ============================================================

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// ✅ BODY PARSER
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// ✅ FILE-BASED DEBUG LOGGING (ASYNCHRONOUS)
const debugLog = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  // Using asynchronous append to prevent blocking the event loop
  fs.appendFile(path.join(__dirname, "debug_log.txt"), logMessage, (err) => {
    if (err) {
      // Silently fail to avoid crashing the server on log errors
    }
  });
};

// ✅ MONGOOSE GLOBAL DEBUG (DISABLED FOR PERFORMANCE)
// mongoose.set('debug', (collectionName, method, query, doc) => {
//   debugLog(`🔧 Mongoose: ${collectionName}.${method}(${JSON.stringify(query)})`);
// });

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// ============================================================
// ✅ SERVE STATIC FILES FOR UPLOADS
// ============================================================

app.use("/uploads", express.static(UPLOADS_BASE_PATH));

// ============================================
// FEEDBACK SCHEMA & MODEL
// ============================================
const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      default: "Anonymous",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 5,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved"],
      default: "pending",
    },
    category: {
      type: String,
      enum: ["bug", "feature", "general", "complaint", "praise"],
      default: "general",
    },
    response: String,
    respondedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

feedbackSchema.index({ userId: 1, createdAt: -1 });
const Feedback = mongoose.model("Feedback", feedbackSchema);

// ============================================================
// ✅ MULTER CONFIGURATION FOR FILE UPLOADS
// ============================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(UPLOADS_BASE_PATH, "studio-photos");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "photo-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// ✅ Separate multer instance for clothing images
const clothingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(UPLOADS_BASE_PATH, "studio-photos");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "clothing-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadClothing = multer({
  storage: clothingStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// ============================================================
// ✅ EMAIL CONFIGURATION (NODEMAILER)
// ============================================================

let emailTransporter;
let emailEnabled = false;

const initializeEmailService = async () => {
  console.log("🔍 Checking email configuration...");
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log(
    "EMAIL_PASSWORD:",
    process.env.EMAIL_PASSWORD ? "✅ Set" : "❌ Not set",
  );

  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    try {
      emailTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      console.log("📧 Verifying email connection...");
      await emailTransporter.verify();
      emailEnabled = true;
      console.log("✅ Email service verified and ready!");
      console.log(`✅ Emails will be sent from: ${process.env.EMAIL_USER}`);
      return true;
    } catch (error) {
      console.error("❌ Email verification failed:", error.message);
      console.error("💡 Check your EMAIL_USER and EMAIL_PASSWORD in .env");
      console.error("💡 Make sure 2-Step Verification is enabled on Gmail");
      console.error(
        "💡 Use App Password from: https://myaccount.google.com/apppasswords",
      );
      return false;
    }
  } else {
    console.warn("⚠️ EMAIL_USER or EMAIL_PASSWORD not found");
    console.warn("💡 Add to .env: EMAIL_USER=your-email@gmail.com");
    console.warn("💡 Add to .env: EMAIL_PASSWORD=your-app-password");
    return false;
  }
};

// ============================================================
// ✅ GROQ AI CHATBOT SETUP
// ============================================================

let groq;
let chatbotEnabled = false;

console.log(
  "🔍 GROQ_API_KEY env var:",
  process.env.GROQ_API_KEY ? "SET" : "NOT SET",
);
console.log(
  "🔍 All env vars:",
  Object.keys(process.env).filter((k) => k.includes("GROQ")),
);

if (process.env.GROQ_API_KEY) {
  try {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    chatbotEnabled = true;
    console.log("✅ Groq AI Chatbot initialized with Llama 3.1 8B Instant");
  } catch (error) {
    console.error("❌ Failed to initialize Groq AI:", error.message);
  }
} else {
  console.warn("⚠️ GROQ_API_KEY not found - Chatbot features disabled");
}

// ✅ In-memory conversation storage
const conversations = new Map();

// ✅ In-memory OTP storage (expires after 5 minutes)
const otpStorage = new Map();
// ============================================================
// ✅ DEBUG ROUTE FOR PRODUCTS
// ============================================================

app.get("/api/debug/products-info", async (req, res) => {
  try {
    console.log("\n🔍 DEBUG: Checking product database info...");

    const info = {
      timestamp: new Date().toISOString(),
      database: {
        name: mongoose.connection.name,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
      },
      productModelExists: !!Product,
      collections: [],
    };

    // List all collections in TRYMI database
    try {
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      info.collections = collections.map((c) => c.name);

      // Check products collection specifically
      if (info.collections.includes("products")) {
        const productsCollection = db.collection("products");
        const count = await productsCollection.countDocuments();
        info.productsCount = count;

        // Get first 3 products
        const sample = await productsCollection.find({}).limit(3).toArray();
        info.sampleProducts = sample.map((p) => ({
          _id: p._id,
          name: p.name,
          category: p.category,
          gender: p.gender,
          price: p.price,
        }));
      }
    } catch (err) {
      info.collectionError = err.message;
    }

    // Try to use Product model
    try {
      if (Product) {
        const modelCount = await Product.countDocuments();
        info.modelCount = modelCount;

        const modelSample = await Product.find({}).limit(3);
        info.modelSample = modelSample.map((p) => ({
          _id: p._id,
          name: p.name,
          category: p.category,
        }));
      }
    } catch (err) {
      info.modelError = err.message;
    }

    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    console.error("❌ Debug error:", error);
    res.status(500).json({
      success: false,
      message: "Debug failed",
      error: error.message,
    });
  }
});
// ============================================================
// ✅ MONGODB DATABASE CONNECTION
// ============================================================

const mongodbUri = process.env.MONGODB_URI || process.env.USER_DB_URI || "mongodb://127.0.0.1:27017/TRYMI";

console.log(`🔗 MongoDB URI: ${mongodbUri.replace(/:([^@]+)@/, ":****@")}`); // Mask password in logs

const initializeDatabases = async () => {
  try {
    debugLog("🚀 Initializing database...");

    // Try SRV connection first
    try {
      debugLog(`⏳ Connecting to Main DB (SRV): ${mongodbUri.replace(/:([^@]+)@/, ":****@")}...`);
      await mongoose.connect(mongodbUri, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      });
    } catch (firstErr) {
      // If SRV lookup fails (ECONNREFUSED / querySrv), try direct shard connection as fallback
      if ((firstErr.message.includes("ECONNREFUSED") || firstErr.message.includes("querySrv")) && mongodbUri.startsWith("mongodb+srv://")) {
        debugLog("⚠️ SRV Lookup failed. Attempting fallback to direct shard connection...");

        const match = mongodbUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
        if (match) {
          const [_, user, pass, host, db] = match;
          const domain = host.split('.').slice(1).join('.'); // dmtpcls.mongodb.net

          // Use the specific shards and replica set we verified
          const rsName = "atlas-jvnj9n-shard-0";
          const fallbackUri = `mongodb://${user}:${pass}@ac-gc1t38j-shard-00-00.${domain}:27017,ac-gc1t38j-shard-00-01.${domain}:27017,ac-gc1t38j-shard-00-02.${domain}:27017/${db.split('?')[0]}?ssl=true&authSource=admin&replicaSet=${rsName}&retryWrites=true&w=majority`;

          debugLog(`⏳ Connecting to Main DB (Fallback): ${fallbackUri.replace(/:([^@]+)@/, ":****@")}...`);
          await mongoose.connect(fallbackUri, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
          });
        } else {
          throw firstErr;
        }
      } else {
        throw firstErr;
      }
    }

    debugLog(`✅ Main DB Connected: ${mongoose.connection.host}`);
    debugLog(`✅ Database name: ${mongoose.connection.name}`);

    // Self-test query
    try {
      debugLog("🧪 Running self-test query...");
      const count = await Product.countDocuments();
      debugLog(`🧪 Self-test query success: ${count} products found`);
    } catch (testErr) {
      debugLog(`❌ Self-test query failed: ${testErr.message}`);
    }

    return true;
  } catch (error) {
    debugLog(`❌ DATABASE CONNECTION ERROR: ${error.message}`);
    if (error.stack) {
      debugLog(`📜 Stack Trace: ${error.stack.split('\n')[0]}`);
    }

    console.error(`\n❌ DATABASE CONNECTION ERROR: ${error.message}`);
    console.log("⏳ Retrying connection in 10 seconds...");
    setTimeout(initializeDatabases, 10000);
    return false;
  }
};

mongoose.connection.on("connected", () => {
  console.log("✅ Mongoose: Main connection established (TRYMI)");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose Connection Error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ Mongoose: Disconnected from MongoDB");
});

mongoose.connection.on("reconnected", () => {
  console.log("🔄 Mongoose: Reconnected to MongoDB");
});

const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️ Received ${signal}. Starting graceful shutdown...`);

  try {
    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed");
    console.log("👋 Server shut down gracefully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ============================================================
// ✅ MIDDLEWARE
// ============================================================

const checkDbConnection = (req, res, next) => {
  debugLog(`🛡️ checkDbConnection for ${req.url}`);
  if (mongoose.connection.readyState !== 1) {
    debugLog(`❌ checkDbConnection: Ready state is ${mongoose.connection.readyState}`);
    return res.status(503).json({
      success: false,
      message: "Database not connected. Please try again later.",
      readyState: mongoose.connection.readyState,
    });
  }
  debugLog("✅ checkDbConnection: Connection healthy, calling next()");
  next();
};

const checkProductDbConnection = checkDbConnection;

// ============================================================
// ✅ ROOT & HEALTH CHECK ROUTES
// ============================================================

app.get("/", (req, res) => {
  res.json({
    message: "TRYMI Backend API Server",
    status: "running",
    port: port,
    databases: {
      users: mongoose.connection.name,
      products: mongoose.connection.name,
    },
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    chatbot: chatbotEnabled ? "enabled" : "disabled",
    email: emailEnabled ? "enabled" : "disabled",
    endpoints: {
      health: "/api/health",
      auth: {
        signup: "POST /api/auth/signup",
        login: "POST /api/auth/login",
        users: "GET /api/auth/users",
        sendOTP: "POST /api/auth/send-otp",
        verifyOTP: "POST /api/auth/verify-otp",
        resetPassword: "POST /api/auth/reset-password",
      },
      products: {
        getAll: "GET /api/products",
        getAllCollections: "GET /api/collections",
        getById: "GET /api/products/:id",
        getByCategory: "GET /api/products/category/:category",
        create: "POST /api/products",
        update: "PUT /api/products/:id",
        delete: "DELETE /api/products/:id",
      },
      wishlist: {
        getWishlist: "GET /api/wishlist/:userId",
        addItem: "POST /api/wishlist/add",
        removeItem: "POST /api/wishlist/remove",
        clearWishlist: "DELETE /api/wishlist/clear/:userId",
      },
      cart: {
        getCart: "GET /api/cart/:userId",
        addItem: "POST /api/cart/add",
        removeItem: "POST /api/cart/remove",
        clearCart: "DELETE /api/cart/clear/:userId",
      },
      chatbot: {
        chat: "POST /api/chatbot/chat",
        recommend: "POST /api/chatbot/recommend",
        clearHistory: "DELETE /api/chatbot/history/:userId",
      },
      studio: {
        uploadPhoto: "POST /api/studio/upload-photo",
        uploadClothing: "POST /api/studio/upload-clothing",
        generateTryOn: "POST /api/studio/generate-tryon",
        getResult: "GET /api/studio/result/:resultId",
        saveLook: "POST /api/studio/save-look",
        getMyLooks: "GET /api/studio/my-looks/:userId",
        deleteLook: "DELETE /api/studio/delete-look/:resultId",
      },
      stats: "GET /api/products/stats/overview",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    uptime: process.uptime(),
    databases: {
      users: {
        name: mongoose.connection.name,
        status:
          mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      },
      products: {
        name: mongoose.connection.name,
        status:
          mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      },
    },
    chatbot: chatbotEnabled ? "enabled" : "disabled",
    email: emailEnabled ? "enabled" : "disabled",
  });
});

// ============================================================
// ✅ EMAIL TEST ENDPOINT (FOR DEBUGGING)
// ============================================================

app.post("/api/test-email", async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("📧 EMAIL SERVICE TEST");
  console.log("=".repeat(60));

  // Check email configuration
  console.log("✅ Test 1: Checking email configuration...");
  console.log("  - EMAIL_USER:", process.env.EMAIL_USER || "❌ NOT SET");
  console.log(
    "  - EMAIL_PASSWORD:",
    process.env.EMAIL_PASSWORD ? "✅ SET" : "❌ NOT SET",
  );
  console.log("  - emailEnabled flag:", emailEnabled);
  console.log("  - emailTransporter exists:", !!emailTransporter);

  if (!emailEnabled) {
    console.error("❌ Email service is NOT enabled!");
    return res.status(503).json({
      success: false,
      message: "Email service is not enabled",
      debug: {
        emailEnabled: emailEnabled,
        emailTransporterExists: !!emailTransporter,
        emailUser: process.env.EMAIL_USER,
        needsConfiguration:
          !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD,
      },
    });
  }

  try {
    console.log("\n✅ Test 2: Attempting to send test email...");

    const mailOptions = {
      from: `"TRYMI Test" <${process.env.EMAIL_USER}>`,
      to: "sunnyvelaga219@gmail.com",
      subject: "TRYMI Email Service Test",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Email Service Test</h2>
          <p>If you received this email, your TRYMI email service is working correctly! ✅</p>
          <p>Test sent at: ${new Date().toISOString()}</p>
          <p>From: ${process.env.EMAIL_USER}</p>
        </div>
      `,
    };

    await emailTransporter.sendMail(mailOptions);
    console.log("✅ Test email sent successfully!");
    console.log("=".repeat(60) + "\n");

    res.json({
      success: true,
      message: "Test email sent successfully!",
      details: {
        from: process.env.EMAIL_USER,
        to: "sunnyvelaga219@gmail.com",
        subject: "TRYMI Email Service Test",
        sentAt: new Date(),
      },
    });
  } catch (error) {
    console.error("❌ Test email failed:", error.message);
    console.error("Full error:", error);
    console.log("=".repeat(60) + "\n");

    res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: error.message,
      debug: {
        emailEnabled: emailEnabled,
        emailTransporter: !!emailTransporter,
        from: process.env.EMAIL_USER,
        to: "sunnyvelaga219@gmail.com",
      },
    });
  }
});

// ============================================================
// ✅ AUTHENTICATION API ROUTES
// ============================================================

app.post("/api/auth/signup", checkDbConnection, async (req, res) => {
  try {
    const { name, email, password, confirmPassword, gender } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered. Please login.",
      });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      gender: gender || null,
    });

    console.log("✅ New user registered:", newUser.email);

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      user: {
        _id: newUser._id,
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        gender: newUser.gender,
      },
    });
  } catch (error) {
    console.error("❌ Signup Error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating account",
      error: error.message,
    });
  }
});

app.post("/api/auth/login", checkDbConnection, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    console.log("✅ User logged in:", user.email);

    res.json({
      success: true,
      message: "Login successful!",
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        age: user.age,
      },
    });
  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
});

app.get("/api/auth/users", checkDbConnection, async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json({
      success: true,
      count: users.length,
      users: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
});
// [REMOVED DUPLICATE /api/products ROUTE TO PREVENT CONFLICTS]

// ============================================================
// ✅ OTP & PASSWORD RESET API ROUTES
// ============================================================

app.post("/api/auth/send-otp", checkDbConnection, async (req, res) => {
  try {
    const { email } = req.body;

    console.log("\n" + "=".repeat(60));
    console.log("📧 SEND OTP REQUEST");
    console.log("=".repeat(60));
    console.log("Email:", email);

    if (!email) {
      console.warn("❌ No email provided");
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(404).json({
        success: false,
        message: "Email not found. Please check your email or sign up.",
      });
    }

    console.log("✅ User found:", user.name);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStorage.set(email.toLowerCase(), {
      otp: otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      createdAt: Date.now(),
    });

    console.log(`🔐 OTP generated: ${otp}`);
    console.log(`⏰ OTP expires in: 5 minutes`);

    // Check email service status
    console.log("\n📧 Email service status:");
    console.log("  - emailEnabled:", emailEnabled);
    console.log("  - emailTransporter exists:", !!emailTransporter);

    if (emailEnabled && emailTransporter) {
      try {
        console.log("📤 Preparing to send OTP email...");
        console.log("  - From:", process.env.EMAIL_USER);
        console.log("  - To:", email);
        console.log("  - Subject: 🔐 Your TRYMI Password Reset OTP");

        const mailOptions = {
          from: `TRYMI <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "🔐 Your TRYMI Password Reset OTP",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { font-size: 28px; font-weight: bold; background: linear-gradient(135deg, #50C878 0%, #00FF9F 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .otp-box { background: linear-gradient(135deg, #50C878 0%, #00FF9F 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; }
                .info { color: #666; font-size: 14px; margin: 20px 0; }
                .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; color: #856404; }
                .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">TRYMI</div>
                  <h2 style="color: #333; margin-top: 10px;">Password Reset Request</h2>
                </div>
                
                <p>Hello ${user.name},</p>
                <p>We received a request to reset your password. Use the OTP below to proceed:</p>
                
                <div class="otp-box">${otp}</div>
                
                <div class="info">
                  <p><strong>⏰ This OTP is valid for 5 minutes only.</strong></p>
                  <p>Enter this OTP on the password reset page to create a new password.</p>
                </div>
                
                <div class="warning">
                  <strong>⚠️ Security Alert:</strong> If you didn't request this password reset, please ignore this email and ensure your account is secure.
                </div>
                
                <div class="footer">
                  <p>This is an automated email from TRYMI. Please do not reply.</p>
                  <p>&copy; 2025 TRYMI. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        };

        await emailTransporter.sendMail(mailOptions);
        console.log("✅ OTP email sent successfully!");
        console.log("=".repeat(60) + "\n");

        return res.json({
          success: true,
          message: `OTP sent to ${email}. Please check your inbox (and spam folder).`,
          emailSent: true,
        });
      } catch (emailError) {
        console.error("❌ Email send error:", emailError.message);
        console.error("   Error code:", emailError.code);
        console.error("   Full error:", emailError);
        console.log("=".repeat(60) + "\n");

        return res.json({
          success: true,
          message: `Email service encountered an error, but OTP was created. Your OTP is: ${otp}`,
          otp: otp,
          emailSent: false,
        });
      }
    } else {
      console.warn("⚠️ Email service not available:");
      if (!emailEnabled) console.warn("   - emailEnabled is false");
      if (!emailTransporter)
        console.warn("   - emailTransporter is not initialized");
      console.log("=".repeat(60) + "\n");

      return res.json({
        success: true,
        message: `Email service not configured. Your OTP is: ${otp}`,
        otp: otp,
        emailSent: false,
      });
    }
  } catch (error) {
    console.error("❌ Send OTP Error:", error);
    console.error("   Stack:", error.stack);
    console.log("=".repeat(60) + "\n");

    res.status(500).json({
      success: false,
      message: "Error sending OTP",
      error: error.message,
    });
  }
});

app.post("/api/auth/verify-otp", checkDbConnection, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const storedOTP = otpStorage.get(email.toLowerCase());

    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or expired. Please request a new one.",
      });
    }

    if (Date.now() > storedOTP.expiresAt) {
      otpStorage.delete(email.toLowerCase());
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (storedOTP.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    console.log(`✅ OTP verified for ${email}`);

    res.json({
      success: true,
      message: "OTP verified successfully!",
    });
  } catch (error) {
    console.error("❌ Verify OTP Error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying OTP",
      error: error.message,
    });
  }
});

app.post("/api/auth/reset-password", checkDbConnection, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    const storedOTP = otpStorage.get(email.toLowerCase());

    if (!storedOTP || storedOTP.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.password = newPassword;
    await user.save();

    otpStorage.delete(email.toLowerCase());

    console.log(`✅ Password reset successful for ${email}`);

    res.json({
      success: true,
      message:
        "Password reset successful! You can now login with your new password.",
    });
  } catch (error) {
    console.error("❌ Reset Password Error:", error);
    res.status(500).json({
      success: false,
      message: "Error resetting password",
      error: error.message,
    });
  }
});

// ============================================================
// ✅ USER PROFILE API ROUTES
// ============================================================

// Get user profile
app.get("/api/profile/:userId", checkDbConnection, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("📋 Fetching profile for user:", userId);

    let user;
    // Support both MongoDB ID and email
    if (userId.includes("@")) {
      user = await User.findOne({ email: userId.toLowerCase() }, "-password");
    } else if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId, "-password");
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("✅ Profile retrieved for:", user.email);

    res.json({
      success: true,
      profile: {
        _id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        age: user.age,
        profileImage: user.profileImage,
        preferences: user.preferences || {},
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: error.message,
    });
  }
});

// Update user profile
app.put("/api/profile/:userId", checkDbConnection, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, gender, age, profileImage } = req.body;

    console.log("📝 Updating profile for user:", userId);

    let user;
    if (userId.includes("@")) {
      user = await User.findOne({ email: userId.toLowerCase() });
    } else if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update allowed fields
    if (name) user.name = name.trim();
    if (gender) user.gender = gender;
    if (age) user.age = parseInt(age);
    if (profileImage) user.profileImage = profileImage;

    await user.save();

    console.log("✅ Profile updated for:", user.email);

    res.json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        _id: user._id,
        name: user.name,
        email: user.email,
        gender: user.gender,
        age: user.age,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
});

// Update user preferences
app.put(
  "/api/profile/:userId/preferences",
  checkDbConnection,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { favoriteCategories, favoriteColors, bodyType, stylePreference } =
        req.body;

      console.log("⚙️  Updating preferences for user:", userId);

      let user;
      if (userId.includes("@")) {
        user = await User.findOne({ email: userId.toLowerCase() });
      } else if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId);
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format",
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Initialize preferences if not exists
      if (!user.preferences) {
        user.preferences = {};
      }

      // Update preferences
      if (favoriteCategories)
        user.preferences.favoriteCategories = favoriteCategories;
      if (favoriteColors) user.preferences.favoriteColors = favoriteColors;
      if (bodyType) user.preferences.bodyType = bodyType;
      if (stylePreference) user.preferences.stylePreference = stylePreference;

      await user.save();

      console.log("✅ Preferences updated for:", user.email);

      res.json({
        success: true,
        message: "Preferences updated successfully",
        preferences: user.preferences,
      });
    } catch (error) {
      console.error("❌ Error updating preferences:", error);
      res.status(500).json({
        success: false,
        message: "Error updating preferences",
        error: error.message,
      });
    }
  },
);

// ============================================================
// ✅ WISHLIST API ROUTES
// ============================================================

app.get("/api/wishlist/:userId", checkDbConnection, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("💝 Fetching wishlist for user:", userId);

    let user;

    // Support both MongoDB ID and email
    if (userId.includes("@")) {
      user = await User.findOne({ email: userId.toLowerCase() });
    } else if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({
        success: false,
        message: "User not found",
        items: [],
      });
    }

    // Manually populate products from productDB
    const wishlistItems = [];
    for (const item of user.wishlist) {
      try {
        const product = await Product.findById(item.productId);
        if (product) {
          // Flatten for easier frontend usage
          wishlistItems.push({
            ...product.toObject(),
            wishlistItemId: item._id,
            addedAt: item.addedAt,
          });
        }
      } catch (err) {
        console.log("⚠️ Product not found:", item.productId);
      }
    }

    console.log(`✅ Found ${wishlistItems.length} items in wishlist`);

    res.json({
      success: true,
      wishlist: wishlistItems,
      count: wishlistItems.length,
    });
  } catch (error) {
    console.error("❌ Error fetching wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching wishlist",
      error: error.message,
    });
  }
});

app.post("/api/wishlist/add", checkDbConnection, async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      console.log("❌ Wishlist Add: Missing params", { userId, productId });
      return res.status(400).json({
        success: false,
        message: `Missing parameters. userId: ${!!userId}, productId: ${!!productId}`,
      });
    }

    console.log("➕ Adding to wishlist:", { userId, productId });

    let user;
    if (userId.includes("@")) {
      user = await User.findOne({ email: userId.toLowerCase() });
    } else {
      user = await User.findById(userId).catch(() => null);
    }

    if (!user) {
      console.log("❌ Wishlist Add: User not found", userId);
      return res.status(404).json({
        success: false,
        message: "User not found in system",
      });
    }

    // Check if product exists in Product DB
    const product = await Product.findById(productId).catch(() => null);
    if (!product) {
      console.log("❌ Wishlist Add: Product not found", productId);
      return res.status(404).json({
        success: false,
        message: "Product not found in database",
      });
    }

    // Check if already in wishlist
    const alreadyExists = user.wishlist.some(
      (item) => item.productId && item.productId.toString() === productId,
    );

    if (alreadyExists) {
      console.log("ℹ️ Wishlist Add: Product already exists", productId);
      return res.status(400).json({
        success: false,
        message: "Product is already in your wishlist",
        alreadyExists: true,
      });
    }

    // Add to wishlist
    user.wishlist.push({
      productId: productId,
      addedAt: new Date(),
    });

    await user.save();

    console.log("✅ Product added to wishlist");

    res.json({
      success: true,
      message: "Product added to wishlist",
      wishlistCount: user.wishlist.length,
    });
  } catch (error) {
    console.error("❌ Error adding to wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error adding to wishlist",
      error: error.message,
    });
  }
});

app.post("/api/wishlist/remove", checkDbConnection, async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Product ID are required",
      });
    }

    console.log("➖ Removing from wishlist:", { userId, productId });

    let user;
    if (userId.includes("@")) {
      user = await User.findOne({ email: userId.toLowerCase() });
    } else {
      user = await User.findById(userId).catch(() => null);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Remove from wishlist
    user.wishlist = user.wishlist.filter(
      (item) => item.productId && item.productId.toString() !== productId,
    );

    await user.save();

    console.log("✅ Product removed from wishlist");

    res.json({
      success: true,
      message: "Product removed from wishlist",
      wishlistCount: user.wishlist.length,
    });
  } catch (error) {
    console.error("❌ Error removing from wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Error removing from wishlist",
      error: error.message,
    });
  }
});

app.delete(
  "/api/wishlist/clear/:userId",
  checkDbConnection,
  async (req, res) => {
    try {
      const { userId } = req.params;

      let user;

      // Support both MongoDB ID and email
      if (userId.includes("@")) {
        user = await User.findOne({ email: userId.toLowerCase() });
      } else {
        user = await User.findById(userId);
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      user.wishlist = [];
      await user.save();

      console.log("✅ Wishlist cleared for user:", userId);

      res.json({
        success: true,
        message: "Wishlist cleared successfully",
      });
    } catch (error) {
      console.error("❌ Error clearing wishlist:", error);
      res.status(500).json({
        success: false,
        message: "Error clearing wishlist",
        error: error.message,
      });
    }
  },
);

// ============================================================
// ✅ CART API ROUTES
// ============================================================

app.get("/api/cart/:userId", checkDbConnection, async (req, res) => {
  try {
    const { userId } = req.params;

    let user;
    if (userId.includes("@")) {
      user = await User.findOne({ email: userId.toLowerCase() });
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found", items: [] });
    }

    // Manually populate products from productDB
    const cartWithProducts = [];
    for (const item of user.cart) {
      try {
        const product = await Product.findById(item.productId);
        if (product) {
          cartWithProducts.push({
            _id: item._id,
            productId: product,
            quantity: item.quantity,
            addedAt: item.addedAt,
          });
        }
      } catch (err) {
        console.log("⚠️ Product not found:", item.productId);
      }
    }

    res.json({
      success: true,
      items: cartWithProducts,
      count: cartWithProducts.length,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching cart",
      error: error.message,
    });
  }
});

app.post("/api/cart/add", checkDbConnection, async (req, res) => {
  try {
    const { userId, productId, quantity = 1 } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Product ID are required",
      });
    }

    let user;
    if (userId.includes("@")) {
      user = await User.findOne({ email: userId.toLowerCase() });
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if already in cart
    const existingItem = user.cart.find(
      (item) => item.productId.toString() === productId,
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      user.cart.push({
        productId: productId,
        quantity: quantity,
        addedAt: new Date(),
      });
    }

    await user.save();

    res.json({
      success: true,
      message: "Product added to cart",
      cartCount: user.cart.length,
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({
      success: false,
      message: "Error adding to cart",
      error: error.message,
    });
  }
});

app.post("/api/cart/remove", checkDbConnection, async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Product ID are required",
      });
    }

    let user;
    if (userId.includes("@")) {
      user = await User.findOne({ email: userId.toLowerCase() });
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.cart = user.cart.filter(
      (item) => item.productId.toString() !== productId,
    );

    await user.save();

    res.json({
      success: true,
      message: "Product removed from cart",
      cartCount: user.cart.length,
    });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({
      success: false,
      message: "Error removing from cart",
      error: error.message,
    });
  }
});

app.delete("/api/cart/clear/:userId", checkDbConnection, async (req, res) => {
  try {
    const { userId } = req.params;

    let user;
    if (userId.includes("@")) {
      user = await User.findOne({ email: userId.toLowerCase() });
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.cart = [];
    await user.save();

    res.json({
      success: true,
      message: "Cart cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({
      success: false,
      message: "Error clearing cart",
      error: error.message,
    });
  }
});

// ============================================================
// ✅ PRODUCT API ROUTES
// ============================================================

app.get("/api/products", checkDbConnection, async (req, res) => {
  try {
    const { category, gender } = req.query;
    debugLog(`📡 [SERVER.JS] /api/products: Fetching (Cat: ${category}, Gen: ${gender})`);

    const query = { status: 'active' };
    if (category && category !== 'all') query.category = category;
    if (gender && gender !== 'all') query.gender = gender;

    const products = await Product.find(query)
      .select('_id name category gender price priceRange image description colors sizes emoji status')
      .sort({ createdAt: -1 })
      // .limit(50) removed to fetch all products
      .lean();

    const sanitized = products.map(p => ({
      ...p,
      _id: p._id.toString(),
      title: p.name || p.title
    }));

    debugLog(`✅ [SERVER.JS] /api/products: Found ${sanitized.length} items`);

    res.json({
      success: true,
      count: sanitized.length,
      data: sanitized,
      source: 'server.js'
    });
  } catch (error) {
    console.error("❌ Error in /api/products:", error);
    res.status(500).json({ success: false, message: "Error fetching products", error: error.message });
  }
});

app.get("/api/collections", checkDbConnection, async (req, res) => {
  try {
    const { gender } = req.query;
    debugLog(`📡 [SERVER.JS] /api/collections: Fetching (Gen: ${gender})`);

    const query = { status: 'active' };
    if (gender && gender !== 'all') query.gender = gender;

    const products = await Product.find(query)
      .select('_id name category gender price priceRange image description colors sizes emoji status')
      .sort({ createdAt: -1 })
      // .limit(50) removed to fetch all collections
      .lean();

    const sanitized = products.map(p => ({
      ...p,
      _id: p._id.toString(),
      title: p.name || p.title
    }));

    debugLog(`✅ [SERVER.JS] /api/collections: Found ${sanitized.length} items`);

    res.json({
      success: true,
      count: sanitized.length,
      data: sanitized,
      source: 'server.js'
    });
  } catch (error) {
    console.error("❌ Error in /api/collections:", error);
    res.status(500).json({ success: false, message: "Error fetching collections", error: error.message });
  }
});

// ✅ Dynamic route to fetch products based on category (Requested by User)
// app.get("/api/collections/:category", async (req, res) => {
//   const category = req.params.category;// e.g., 'shirts'
//   const { gender } = req.query; // mens | womens | unisex
//   console.log(`🔍 Fetching dynamic collection: products_${category}`);

//   try {
//     // Dynamically accessing a collection based on the URL parameter
//     // Using userDB (TRYMI) connection or productDB.db depending on where they are
//     // Assuming they are in the main database
//     // 1. Try to find in specific collection (e.g., products_shirts)
//     const db = mongoose.connection.db;
//     const collectionName = `products_${category}`;
//     const collection = db.collection(collectionName);
//     let data = await collection.find({}).toArray();

//     console.log(`✅ Found ${data.length} items in ${collectionName}`);

//     // 2. Fallback: If specific collection is empty, search in the main 'products' collection
//     if (data.length === 0) {
//       console.log(`⚠️ ${collectionName} is empty. Searching in main 'products' collection for category: '${category}'...`);
//       // Case-insensitive regex search for category
//       data = await Product.find({
//         category: { $regex: new RegExp(`^${category}$`, 'i') }
//       });
//       console.log(`✅ Found ${data.length} items in main 'products' collection matching category '${category}'`);
//     }

//     res.json({
//       success: true,
//       count: data.length,
//       data: data
//     });
//   } catch (error) {
//     console.error(`❌ Error fetching products_${category}:`, error);
//     res.status(500).json({
//       success: false,
//       message: "Collection not found or error occurred.",
//       error: error.message
//     });
//   }
// });
app.get("/api/collections/:category", checkDbConnection, async (req, res) => {
  const { category } = req.params;
  const { gender } = req.query;

  console.log(`🔍 Fetching category: ${category}, gender: ${gender}`);

  try {
    // Priority: Search in the main 'products' collection (standardized)
    const query = {
      category: { $regex: new RegExp(`^${category}$`, "i") },
    };

    if (gender && gender !== "all" && gender !== "undefined") {
      query.gender = { $in: [gender, "unisex", "all"] };
    }

    let data = await Product.find(query).sort({ createdAt: -1 });

    // Fallback: Try category-specific collection only if main search yields nothing (backward compatibility)
    if (data.length === 0) {
      console.log(
        `⚠️ No items found in main 'products' collection for category '${category}'. Checking for specific collection...`,
      );
      const db = mongoose.connection.db;
      const collectionName = `products_${category}`;
      const collection = db.collection(collectionName);
      data = await collection
        .find(
          gender && gender !== "all"
            ? { gender: { $in: [gender, "unisex", "all"] } }
            : {},
        )
        .toArray();
    }

    console.log(`✅ Returned ${data.length} items for category '${category}'`);

    res.json({
      success: true,
      count: data.length,
      data: data.map(p => ({
        ...p,
        _id: p._id,
        title: p.name || p.title, // Standardize title for frontend
      }))
    });
  } catch (error) {
    console.error("❌ Error fetching category products:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
});

app.get("/api/products/:id", checkProductDbConnection, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message,
    });
  }
});

app.get(
  "/api/products/category/:category",
  checkProductDbConnection,
  async (req, res) => {
    try {
      const { category } = req.params;
      const products = await Product.find({
        category: category,
        status: "active",
      }).sort({ createdAt: -1 });

      res.json({
        success: true,
        count: products.length,
        data: products,
      });
    } catch (error) {
      console.error("Error fetching products by category:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching products by category",
        error: error.message,
      });
    }
  },
);

app.post("/api/products", checkProductDbConnection, async (req, res) => {
  try {
    const newProduct = await Product.create(req.body);
    console.log("✅ New product created:", newProduct.name);
    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: newProduct,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      success: false,
      message: "Error creating product",
      error: error.message,
    });
  }
});

app.put("/api/products/:id", checkProductDbConnection, async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    console.log("✅ Product updated:", updatedProduct.name);
    res.json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Error updating product",
      error: error.message,
    });
  }
});

app.delete("/api/products/:id", checkProductDbConnection, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    console.log("✅ Product deleted:", deletedProduct.name);
    res.json({
      success: true,
      message: "Product deleted successfully",
      data: deletedProduct,
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: error.message,
    });
  }
});

app.get(
  "/api/products/stats/overview",
  checkProductDbConnection,
  async (req, res) => {
    try {
      const totalProducts = await Product.countDocuments();
      const activeProducts = await Product.countDocuments({ status: "active" });
      const productsByCategory = await Product.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      const productsByGender = await Product.aggregate([
        { $group: { _id: "$gender", count: { $sum: 1 } } },
      ]);

      res.json({
        success: true,
        data: {
          total: totalProducts,
          active: activeProducts,
          inactive: totalProducts - activeProducts,
          byCategory: productsByCategory,
          byGender: productsByGender,
        },
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching statistics",
        error: error.message,
      });
    }
  },
);

// ============================================================
// ✅ PRODUCT SEEDING ENDPOINT
// ============================================================

app.post("/api/seed/products", checkProductDbConnection, async (req, res) => {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🌱 SEEDING PRODUCTS INTO DATABASE");
    console.log("=".repeat(60));

    // Sample product data
    const sampleProducts = [
      // Men's T-Shirts
      {
        name: "Classic Oxford White Shirt",
        description:
          "Timeless white Oxford shirt with perfect fit and premium cotton construction. Button-down collar and curved hem.",
        category: "tshirts",
        gender: "mens",
        price: 89.99,
        priceRange: "$89.99",
        colors: ["white", "off-white"],
        image:
          "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=400",
        status: "active",
        inStock: true,
        tags: ["formal", "business", "classic"],
        stock: 50,
      },
      {
        name: "Premium Black T-Shirt",
        description:
          "Essential crew neck t-shirt in ultra-soft cotton. Perfect for everyday wear.",
        category: "tshirts",
        gender: "mens",
        price: 45.0,
        priceRange: "$45",
        colors: ["black", "charcoal"],
        image:
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400",
        status: "active",
        inStock: true,
        tags: ["casual", "essential", "basic"],
        stock: 100,
      },
      {
        name: "Navy Blue Polo Shirt",
        description:
          "Classic polo shirt in breathable cotton pique fabric. Perfect for smart casual occasions.",
        category: "tshirts",
        gender: "mens",
        price: 54.99,
        priceRange: "$54.99",
        colors: ["navy", "blue"],
        image:
          "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?auto=format&fit=crop&q=80&w=400",
        status: "active",
        inStock: true,
        tags: ["polo", "smart-casual"],
        stock: 75,
      },
      // Women's Dresses
      {
        name: "Floral Summer Maxi Dress",
        description:
          "Elegant floral print maxi dress perfect for summer. Features flattering A-line silhouette.",
        category: "dress",
        gender: "womens",
        price: 129.99,
        priceRange: "$129.99",
        colors: ["pink", "rose"],
        image:
          "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80&w=400",
        status: "active",
        inStock: true,
        tags: ["summer", "floral", "maxi"],
        stock: 30,
      },
      {
        name: "Elegant Black Evening Dress",
        description:
          "Sophisticated little black dress perfect for evening events. Timeless design with modern details.",
        category: "dress",
        gender: "womens",
        price: 149.99,
        priceRange: "$149.99",
        colors: ["black"],
        image:
          "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=400",
        status: "active",
        inStock: true,
        tags: ["evening", "formal", "elegant"],
        stock: 25,
      },
      // Bottoms
      {
        name: "Classic Blue Denim Jeans",
        description:
          "Timeless straight-leg denim jeans in classic blue wash. Made from premium stretch denim.",
        category: "bottom",
        gender: "unisex",
        price: 79.99,
        priceRange: "$79.99",
        colors: ["blue", "indigo"],
        image:
          "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=400",
        status: "active",
        inStock: true,
        tags: ["denim", "jeans", "casual"],
        stock: 60,
      },
      {
        name: "Black Slim Fit Chinos",
        description:
          "Versatile slim-fit chinos in black. Perfect for casual and smart-casual outfits.",
        category: "bottom",
        gender: "mens",
        price: 69.99,
        priceRange: "$69.99",
        colors: ["black", "charcoal"],
        image:
          "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=400",
        status: "active",
        inStock: true,
        tags: ["chinos", "smart-casual"],
        stock: 45,
      },
      {
        name: "Beige Cargo Pants",
        description:
          "Comfortable cargo pants with multiple pockets. Perfect for casual outdoor wear.",
        category: "bottom",
        gender: "mens",
        price: 74.99,
        priceRange: "$74.99",
        colors: ["beige", "khaki"],
        image:
          "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=400",
        status: "active",
        inStock: true,
        tags: ["cargo", "casual", "outdoor"],
        stock: 40,
      },
      // Jackets
      {
        name: "Vintage Leather Biker Jacket",
        description:
          "Classic leather biker jacket with vintage appeal. Perfect layering piece.",
        category: "jackets",
        gender: "mens",
        price: 199.99,
        priceRange: "$199.99",
        colors: ["black", "brown"],
        image:
          "https://images.unsplash.com/photo-1551028719-00167b16ebc5?auto=format&fit=crop&q=80&w=400",
        status: "active",
        inStock: true,
        tags: ["leather", "biker", "vintage"],
        stock: 20,
      },
      {
        name: "Denim Trucker Jacket",
        description:
          "Classic blue denim jacket. Versatile piece that works with any outfit.",
        category: "jackets",
        gender: "unisex",
        price: 89.99,
        priceRange: "$89.99",
        colors: ["blue", "indigo"],
        image:
          "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&q=80&w=400",
        status: "active",
        inStock: true,
        tags: ["denim", "casual", "classic"],
        stock: 35,
      },
      // Shoes
      {
        name: "White Canvas Sneakers",
        description:
          "Classic white canvas sneakers. Timeless style for everyday wear.",
        category: "shoes",
        gender: "unisex",
        price: 65.0,
        priceRange: "$65",
        colors: ["white", "cream"],
        image:
          "https://images.unsplash.com/photo-1577803645773-f96433ba8334?auto=format&fit=crop&q=80&w=400",
        status: "active",
        inStock: true,
        tags: ["sneakers", "casual", "white"],
        stock: 80,
      },
      {
        name: "Black Leather Dress Shoes",
        description:
          "Elegant black leather dress shoes. Perfect for formal occasions.",
        category: "shoes",
        gender: "mens",
        price: 129.99,
        priceRange: "$129.99",
        colors: ["black"],
        image:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400",
        status: "active",
        inStock: true,
        tags: ["formal", "leather", "dress"],
        stock: 25,
      },
      // Bags
      {
        name: "Premium Leather Crossbody Bag",
        description:
          "Elegant leather crossbody bag with adjustable strap. Perfect for daily essentials.",
        category: "bag",
        gender: "womens",
        price: 149.99,
        priceRange: "$149.99",
        colors: ["black", "brown", "tan"],
        image:
          "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=400",
        status: "active",
        inStock: true,
        tags: ["leather", "crossbody", "premium"],
        stock: 20,
      },
    ];

    // Clear existing products
    const deleteResult = await Product.deleteMany({});
    console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing products`);

    // Insert new products
    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`✨ Successfully seeded ${createdProducts.length} products\n`);

    // Display summary
    const categories = [...new Set(createdProducts.map((p) => p.category))];
    console.log("📂 Categories:", categories.join(", "));
    console.log("\n📋 Products seeded:");
    createdProducts.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (${p.category}) - $${p.price}`);
    });

    console.log("=".repeat(60) + "\n");

    res.json({
      success: true,
      message: `Successfully seeded ${createdProducts.length} products`,
      count: createdProducts.length,
      data: createdProducts,
    });
  } catch (error) {
    console.error("❌ Seeding error:", error);
    res.status(500).json({
      success: false,
      message: "Error seeding products",
      error: error.message,
    });
  }
});

// ============================================================
// ✅ CHATBOT API ROUTES
// ============================================================

const addToHistory = (userId, userMessage, aiResponse) => {
  if (!conversations.has(userId)) {
    conversations.set(userId, []);
  }
  const history = conversations.get(userId);
  history.push(
    { role: "user", content: userMessage },
    { role: "assistant", content: aiResponse },
  );
  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }
};

const getHistory = (userId) => {
  return conversations.get(userId) || [];
};

app.post("/api/chatbot/chat", async (req, res) => {
  try {
    console.log("📨 Chat request received");
    console.log("🔍 chatbotEnabled:", chatbotEnabled);
    console.log("🔍 groq client exists:", !!groq);

    if (!chatbotEnabled) {
      return res.status(503).json({
        success: false,
        message:
          "Chatbot service is not available. Please configure GROQ_API_KEY.",
      });
    }

    if (!groq) {
      return res.status(500).json({
        success: false,
        message: "Groq client not initialized. Please check GROQ_API_KEY.",
      });
    }

    const { userId, message, userProfile } = req.body;
    console.log("📝 Message received:", message.substring(0, 50) + "...");

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const history = getHistory(userId || "guest");

    const messages = [
      {
        role: "system",
        content:
          "You are a professional fashion stylist AI assistant for TRYMI outfit predictor app. Provide personalized fashion advice, outfit recommendations, and style guidance. Be friendly, conversational, and helpful. Keep responses under 200 words.",
      },
    ];

    if (history.length > 0) {
      messages.push(...history);
    }

    let userMessage = message;
    if (
      history.length === 0 &&
      userProfile &&
      Object.keys(userProfile).length > 0
    ) {
      userMessage = `User Profile: ${JSON.stringify(userProfile)}\n\nQuestion: ${message}`;
    }

    messages.push({ role: "user", content: userMessage });

    const completion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 500,
      top_p: 1,
      stream: false,
    });

    const responseText =
      completion.choices[0]?.message?.content ||
      "I apologize, but I couldn't generate a response. Please try again.";

    addToHistory(userId || "guest", message, responseText);

    res.json({
      success: true,
      message: responseText,
      conversationId: userId || "guest",
      model: "llama-3.1-8b-instant",
    });
  } catch (error) {
    console.error("Chat Error:", error);
    console.error("Chat Error Stack:", error.stack);
    res.status(500).json({
      success: false,
      error: "Chat failed. Please try again.",
      details: error.message,
    });
  }
});

app.post("/api/chatbot/recommend", async (req, res) => {
  try {
    if (!chatbotEnabled) {
      return res.status(503).json({
        success: false,
        message:
          "Chatbot service is not available. Please configure GROQ_API_KEY.",
      });
    }

    const { userId, message, userProfile } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const prompt = `You are a professional fashion stylist AI for TRYMI outfit predictor app.

User Profile:
${userProfile?.gender ? `- Gender: ${userProfile.gender}` : ""}
${userProfile?.age ? `- Age: ${userProfile.age}` : ""}
${userProfile?.bodyType ? `- Body Type: ${userProfile.bodyType}` : ""}
${userProfile?.style ? `- Style Preference: ${userProfile.style}` : ""}

User Request: ${message}

Provide personalized outfit recommendations with:
1. Specific clothing items (tops, bottoms, accessories)
2. Color combinations
3. Why it suits them
4. Styling tips
5. Occasion suitability

Keep response friendly, conversational, and under 200 words.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a professional fashion stylist AI assistant for TRYMI.",
        },
        { role: "user", content: prompt },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText =
      completion.choices[0]?.message?.content ||
      "I apologize, but I couldn't generate recommendations. Please try again.";

    addToHistory(userId || "guest", message, responseText);

    res.json({
      success: true,
      message: responseText,
      timestamp: new Date(),
      model: "llama-3.1-8b-instant",
    });
  } catch (error) {
    console.error("Recommendation Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to generate recommendation. Please try again.",
      details: error.message,
    });
  }
});

app.delete("/api/chatbot/history/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    conversations.delete(userId);
    console.log("Cleared chat history for user:", userId);
    res.json({
      success: true,
      message: "Chat history cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing history:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to clear history",
    });
  }
});

// ============================================================
// ✅ STUDIO API ROUTES (CORRECTED)
// ============================================================

app.post(
  "/api/studio/upload-photo",
  checkDbConnection,
  upload.single("photo"),
  async (req, res) => {
    try {
      console.log("📸 Studio Photo Upload Request");
      if (!req.file) {
        console.warn("⚠️ No photo file in request");
        return res.status(400).json({
          success: false,
          error: "No photo uploaded",
        });
      }

      console.log(`📁 Received file: ${req.file.filename} (${req.file.size} bytes)`);

      const photoUrl = `/uploads/studio-photos/${req.file.filename}`;
      let userId = req.body.userId;
      
      // Ensure userId is a valid ObjectId if provided, otherwise generate one
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        console.log("ℹ️ No valid userId provided, generating temporary ID or using 'guest' context");
        userId = new mongoose.Types.ObjectId();
      }

      const studioPhoto = new StudioPhoto({
        userId: userId,
        photoUrl: photoUrl,
        metadata: {
          width: req.body.width || null,
          height: req.body.height || null,
          format: path.extname(req.file.filename),
        },
      });

      await studioPhoto.save();

      console.log("✅ Studio photo saved to DB:", studioPhoto._id);

      res.json({
        success: true,
        photoId: studioPhoto._id,
        photoUrl: photoUrl,
      });
    } catch (error) {
      console.error("❌ Upload error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload photo",
        details: error.message,
      });
    }
  },
);

app.post(
  "/api/studio/upload-clothing",
  uploadClothing.single("clothingImage"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No clothing image uploaded",
        });
      }

      const clothingUrl = `/uploads/studio-photos/${req.file.filename}`;

      res.json({
        success: true,
        clothingUrl: clothingUrl,
      });
    } catch (error) {
      console.error("❌ Clothing upload error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to upload clothing image",
        details: error.message,
      });
    }
  },
);

// ✅ CORRECTED: Generate Try-On Endpoint
app.post(
  "/api/studio/generate-tryon",
  checkDbConnection,
  uploadClothing.single("clothingImage"),
  async (req, res) => {
    try {
      console.log("\n" + "=".repeat(60));
      console.log("🎨 TRY-ON GENERATION REQUEST");
      console.log("=".repeat(60));
      console.log("📦 Request body:", req.body);
      console.log("📁 Request file:", req.file ? req.file.filename : "None");

      const { photoId, productId, clothingImageUrl } = req.body;

      // ✅ STEP 1: Validate photoId
      if (!photoId) {
        console.error("❌ No photoId provided");
        return res.status(400).json({
          success: false,
          error: "Photo ID is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(photoId)) {
        console.error("❌ Invalid photoId format:", photoId);
        return res.status(400).json({
          success: false,
          error: "Invalid photo ID format",
        });
      }

      // ✅ STEP 2: Find the studio photo
      const studioPhoto = await StudioPhoto.findById(photoId);
      if (!studioPhoto) {
        console.error("❌ Photo not found for ID:", photoId);
        return res.status(404).json({
          success: false,
          error: "Photo not found",
        });
      }

      console.log("✅ Found studio photo:", studioPhoto._id);
      console.log("📸 Photo URL:", studioPhoto.photoUrl);

      // ✅ STEP 3: Determine clothing image path (PRIORITY ORDER)
      let clothingPath = null;
      let clothingSource = "";
      let rawCategory = req.body.category || "upper_body";

      // Priority 1: Product from database
      if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        try {
          const product = await Product.findById(productId);
          if (product && product.image) {
            clothingPath = product.image;
            rawCategory = product.category || rawCategory;
            clothingSource = `Product: ${product.name}`;
            console.log("👕 Using product image:", product.name);
            console.log("   Category from product:", rawCategory);
            console.log("   Image path:", product.image);
          }
        } catch (err) {
          console.log("⚠️ Product lookup failed:", err.message);
        }
      }

      // Priority 2: Direct clothing image URL (from req.body)
      if (!clothingPath && clothingImageUrl) {
        clothingPath = clothingImageUrl;
        clothingSource = "Direct URL";
        console.log("👕 Using clothing URL from body:", clothingImageUrl);
      }

      // Priority 3: Uploaded file
      if (!clothingPath && req.file) {
        clothingPath = `/uploads/studio-photos/${req.file.filename}`;
        clothingSource = `Uploaded file: ${req.file.filename}`;
        console.log("👕 Using uploaded file:", req.file.filename);
      }

      // ✅ STEP 4: Validate clothing image exists
      if (!clothingPath) {
        console.error("❌ No clothing image provided");
        console.error("   productId:", productId);
        console.error("   clothingImageUrl:", clothingImageUrl);
        console.error("   req.file:", req.file);
        return res.status(400).json({
          success: false,
          error:
            "No clothing image provided. Please select a product or upload an image.",
        });
      }

      console.log("✅ Clothing source:", clothingSource);
      console.log("✅ Clothing path:", clothingPath);

      console.log("DEBUG: __dirname =", __dirname);
      const projectRoot = path.join(__dirname, "..");
      console.log("DEBUG: projectRoot =", projectRoot);

      // ✅ STEP 5: Prepare full file paths for AI service
      const personImageFullPath = path.join(
        projectRoot,
        studioPhoto.photoUrl.replace(/^\//, ""),
      );

      let clothingImageFullPath;

      // ✅ Handle base64 encoded images (from wishlist products)
      if (clothingPath.startsWith("data:image")) {
        console.log("🖼️ Detected base64 image, converting to file...");
        const savedPath = saveBase64Image(clothingPath);
        if (!savedPath) {
          console.error("❌ Failed to save base64 image");
          return res.status(400).json({
            success: false,
            error: "Failed to process clothing image",
          });
        }
        clothingImageFullPath = path.join(
          projectRoot,
          savedPath.replace(/^\//, ""),
        );
        console.log("✅ Base64 image saved to:", clothingImageFullPath);
      } else if (
        clothingPath.startsWith("http://") ||
        clothingPath.startsWith("https://")
      ) {
        // External URL - pass as-is
        clothingImageFullPath = clothingPath;
        console.log("🌐 Using external URL:", clothingPath);
      } else {
        // Local path - resolve to full path
        clothingImageFullPath = path.join(
          projectRoot,
          clothingPath.replace(/^\//, ""),
        );
        console.log("📁 Using local path:", clothingImageFullPath);
      }

      console.log("📤 Person image path:", personImageFullPath);
      console.log("📤 Clothing image path:", clothingImageFullPath);

      // ✅ STEP 6: Verify person image file exists
      if (!fs.existsSync(personImageFullPath)) {
        console.error("❌ Person image file not found:", personImageFullPath);
        return res.status(404).json({
          success: false,
          error: "Photo file not found on server",
        });
      }

      // ✅ STEP 7: Verify clothing image file exists (if local)
      if (!clothingImageFullPath.startsWith("http")) {
        if (!fs.existsSync(clothingImageFullPath)) {
          console.error(
            "❌ Clothing image file not found:",
            clothingImageFullPath,
          );
          return res.status(404).json({
            success: false,
            error: "Clothing image file not found on server",
          });
        }
      }

      // ✅ STEP 8: Prepare AI service request
      const outputFolder = path.join(UPLOADS_BASE_PATH, "tryon-results");

      // Ensure output folder exists
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      // ✅ CATEGORY MAPPING LAYER (AI Expects: upper_body, lower_body, dresses)
      const categoryMapping = {
        pants: "lower_body",
        trousers: "lower_body",
        shirts: "upper_body",
        tshirts: "upper_body",
        tops: "upper_body",
        jackets: "upper_body",
        dress: "dresses",
        dresses: "dresses",
        // ✅ Direct placement categories (Pass-through)
        lower_body: "lower_body",
        upper_body: "upper_body",
        full_body: "dresses", // AI usually treats full_body as dresses
      };

      const aiCategory =
        categoryMapping[rawCategory.toLowerCase()] || "upper_body";

      console.log(`🏷️  Category Mapping: "${rawCategory}" -> "${aiCategory}"`);

      // ✅ PRODUCTION FIX: Backend and AI Service are on different servers.
      // We must send images as Base64 because they don't share a filesystem.
      console.log("📂 Reading images for AI service...");
      let personImageBase64 = "";
      let clothingImageBase64 = "";

      try {
        const pBuffer = fs.readFileSync(personImageFullPath);
        personImageBase64 = `data:image/jpeg;base64,${pBuffer.toString("base64")}`;
        
        const cBuffer = fs.readFileSync(clothingImageFullPath);
        clothingImageBase64 = `data:image/jpeg;base64,${cBuffer.toString("base64")}`;

        console.log("✅ Images converted to Base64");
      } catch (readError) {
        console.error("❌ Error reading images for Base64 conversion:", readError.message);
        throw new Error("Failed to read images for AI service");
      }

      const aiServiceData = {
        personImageBase64: personImageBase64,
        clothingItems: [
          {
            imageUrl: clothingImageBase64,
            category: aiCategory,
          },
        ],
      };

      console.log("🤖 Calling AI service with data:");
      console.log("   Person:", personImageFullPath);
      console.log("   Clothing Item 1:", clothingImageFullPath);
      console.log("   Category (Mapped):", aiCategory);
      console.log("   Output:", outputFolder);

      let aiResponse;
      let isPlaceholder = false;

      try {
        // ✅ Call the Python AI service
        const PYTHON_AI_URL = process.env.PYTHON_AI_URL || process.env.AI_SERVICE_URL || "http://localhost:5001";
        console.log(`🤖 Calling AI service at: ${PYTHON_AI_URL}/api/generate-tryon`);
        
        aiResponse = await axios.post(
          `${PYTHON_AI_URL}/api/generate-tryon`,
          aiServiceData,
          {
            timeout: 300000, // 5 minutes (Extended to allow HF Space wake-up)
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        console.log("✅ AI service response received");
        console.log("   Status:", aiResponse.status);
        console.log("   Result URL:", aiResponse.data.resultImageUrl);
        console.log("   Processing Time:", aiResponse.data.processingTime);
      } catch (aiError) {
        console.error("❌ AI service error details:");
        console.error("   Message:", aiError.message);
        if (aiError.response) {
          console.error("   Status:", aiError.response.status);
          console.error("   Data:", JSON.stringify(aiError.response.data));
        }

        // ✅ Return selected outfit image as fallback instead of placeholder
        isPlaceholder = true;
        const resultUrl = clothingPath; // Use the selected outfit image

        aiResponse = {
          data: {
            resultImageUrl: resultUrl,
            animatedUrl: null,
            processingTime: "0s",
            warning: "AI service unavailable - showing selected outfit",
          },
        };

        console.log("⚠️ AI service not available, returning selected outfit");
      }

      // ✅ STEP 9: Save result to database
      const tryOnResult = new TryOnResult({
        userId: studioPhoto.userId,
        photoId: photoId,
        productId: productId || null,
        clothingImageUrl: clothingPath,
        resultImageUrl: aiResponse.data.resultImageUrl,
        animatedUrl: aiResponse.data.animatedUrl || null,
      });

      await tryOnResult.save();

      console.log("✅ Try-on result saved:", tryOnResult._id);
      console.log("=".repeat(60) + "\n");

      res.json({
        success: true,
        resultId: tryOnResult._id,
        resultImageUrl: aiResponse.data.resultImageUrl,
        animatedUrl: aiResponse.data.animatedUrl,
        processingTime: aiResponse.data.processingTime || "0s",
        isPlaceholder: isPlaceholder,
        warning: aiResponse.data.warning || null,
      });
    } catch (error) {
      console.error("❌ Try-on generation error:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).json({
        success: false,
        error: "Failed to generate try-on",
        details: error.message,
      });
    }
  },
);

app.get("/api/studio/result/:resultId", checkDbConnection, async (req, res) => {
  try {
    console.log("📋 Fetching try-on result:", req.params.resultId);

    // ✅ First, get the result without populating productId
    const result = await TryOnResult.findById(req.params.resultId).populate(
      "photoId",
    );

    if (!result) {
      console.error("❌ Result not found");
      return res.status(404).json({
        success: false,
        error: "Result not found",
      });
    }

    console.log("✅ Found result:", result._id);

    // ✅ Manually fetch product if productId exists (from different DB connection)
    let productData = null;
    if (result.productId) {
      try {
        productData = await Product.findById(result.productId);
        console.log("✅ Product found:", productData?.name);
      } catch (err) {
        console.log("⚠️ Product not found or error:", err.message);
      }
    }

    res.json({
      success: true,
      id: result._id,
      originalPhotoUrl: result.photoId?.photoUrl || null,
      resultImageUrl: result.resultImageUrl,
      animatedUrl: result.animatedUrl,
      productId: productData?._id || null,
      productName: productData?.name || null,
      productImage: productData?.image || null,
      productPrice: productData?.price || null,
      createdAt: result.createdAt,
      saved: result.saved,
    });
  } catch (error) {
    console.error("❌ Get result error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch result",
      details: error.message,
    });
  }
});

app.post("/api/studio/save-look", checkDbConnection, async (req, res) => {
  try {
    const { resultId } = req.body;

    const result = await TryOnResult.findByIdAndUpdate(
      resultId,
      { saved: true },
      { new: true },
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Result not found",
      });
    }

    console.log("✅ Look saved:", resultId);

    res.json({
      success: true,
      message: "Look saved successfully",
    });
  } catch (error) {
    console.error("❌ Save look error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save look",
      details: error.message,
    });
  }
});

app.get("/api/studio/my-looks/:userId", async (req, res) => {
  console.log("📥 GET /api/studio/my-looks/:userId");

  try {
    const { userId } = req.params;

    // ✅ FIX: Convert email to MongoDB _id
    let mongoUserId = userId;

    if (userId.includes("@")) {
      const user = await User.findOne({ email: userId });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      mongoUserId = user._id.toString();
      console.log(`✅ Converted email to MongoDB _id: ${mongoUserId}`);
    }

    // Query with proper ObjectId
    const looks = await TryOnResult.find({ userId: mongoUserId })
      .populate("productId", "name image category")
      .populate("photoId", "originalUrl")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    console.log(`✅ Found ${looks.length} looks`);

    res.json({
      success: true,
      looks,
      count: looks.length,
    });
  } catch (error) {
    console.error("❌ Get my looks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch looks",
      error: error.message,
    });
  }
});

app.delete(
  "/api/studio/delete-look/:resultId",
  checkDbConnection,
  async (req, res) => {
    try {
      const { resultId } = req.params;

      await TryOnResult.findByIdAndDelete(resultId);

      console.log("✅ Look deleted:", resultId);

      res.json({
        success: true,
        message: "Look deleted successfully",
      });
    } catch (error) {
      console.error("❌ Delete look error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete look",
        details: error.message,
      });
    }
  },
);

// ✅ AI Service Proxy: Status (For health checks and quota)
app.get("/api/ai-status", async (req, res) => {
  try {
    const PYTHON_AI_URL = process.env.PYTHON_AI_URL || process.env.AI_SERVICE_URL || "http://localhost:5001";
    console.log(`📡 Proxying AI Status request to: ${PYTHON_AI_URL}/api/ai-status`);
    
    const response = await axios.get(`${PYTHON_AI_URL}/api/ai-status`, {
      timeout: 60000, // 60s for status check to allow Render wake-up
    });
    res.json(response.data);
  } catch (error) {
    console.warn("⚠️ AI Status Proxy Error:", error.message);
    res.json({
      status: "OFFLINE",
      message: "AI Service is waking up or unreachable",
      isActive: false,
      error: error.message
    });
  }
});

// ✅ AI Service Proxy: Health (Direct health endpoint)
app.get("/api/ai-health", async (req, res) => {
  try {
    const PYTHON_AI_URL = process.env.PYTHON_AI_URL || process.env.AI_SERVICE_URL || "http://localhost:5001";
    console.log(`📡 Proxying AI Health request to: ${PYTHON_AI_URL}/health`);
    const response = await axios.get(`${PYTHON_AI_URL}/health`, {
      timeout: 60000,
    });
    res.json(response.data);
  } catch (error) {
    console.warn("⚠️ AI Health Proxy Error:", error.message);
    res.json({
      status: "unhealthy",
      model_loaded: false,
      error: error.message
    });
  }
});

// ✅ AI Service Proxy: Quota
app.get("/api/quota-status", async (req, res) => {
  try {
    const PYTHON_AI_URL = process.env.PYTHON_AI_URL || process.env.AI_SERVICE_URL || "http://localhost:5001";
    const response = await axios.get(`${PYTHON_AI_URL}/api/quota-status`, {
      timeout: 60000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("❌ AI Quota Proxy Error:", error.message);
    res.status(503).json({
      success: false,
      error: "AI Quota Service unreachable"
    });
  }
});

// ============================================
// FEEDBACK ROUTES
// ============================================

// Submit Feedback
app.post("/api/feedback", async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("📥 POST /api/feedback");
  console.log("=".repeat(60));

  try {
    const { userId, userName, email, message, rating, category } = req.body;

    console.log("📨 Received feedback:");
    console.log("  - userId:", userId);
    console.log("  - userName:", userName);
    console.log("  - email:", email);
    console.log("  - rating:", rating);
    console.log("  - category:", category);
    console.log("  - messageLength:", message?.length);

    // Validation
    if (!userId || !message) {
      console.warn("❌ Validation failed: Missing userId or message");
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      console.warn("❌ Validation failed: Invalid rating:", rating);
      return res.status(400).json({
        success: false,
        message: "Rating must be 1-5",
      });
    }

    // Get user email
    let userEmail = email;
    if (!userEmail) {
      try {
        const user = await User.findOne({
          $or: [{ _id: userId }, { email: userId }],
        });
        userEmail = user?.email || userId;
        console.log("✅ Found user email:", userEmail);
      } catch (err) {
        console.warn("⚠️ Could not find user, using userId as email:", userId);
        userEmail = userId;
      }
    }

    // Create feedback
    const feedback = new Feedback({
      userId,
      userEmail,
      userName: userName || "Anonymous",
      rating: parseInt(rating),
      message: message.trim(),
      category: category || "general",
      status: "pending",
    });

    await feedback.save();
    console.log("✅ Feedback saved to database:", feedback._id);

    // ✅ SEND EMAIL NOTIFICATION TO ADMIN
    console.log("\n📧 Email service status:");
    console.log("  - emailEnabled:", emailEnabled);
    console.log("  - emailTransporter exists:", !!emailTransporter);

    if (emailEnabled && emailTransporter) {
      try {
        console.log("📤 Preparing to send email...");
        console.log("  - From:", process.env.EMAIL_USER);
        console.log("  - To: sunnyvelaga219@gmail.com");
        console.log(
          "  - Subject: New Feedback Received - " + rating + " Stars",
        );

        const mailOptions = {
          from: `"TRYMI Feedback" <${process.env.EMAIL_USER}>`,
          to: "sunnyvelaga219@gmail.com",
          subject: `New Feedback Received - ${rating} Stars`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
              <h2 style="color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">New Feedback from ${userName || "User"}</h2>
              <div style="margin: 20px 0;">
                <p><strong>User Email:</strong> ${userEmail}</p>
                <p><strong>Rating:</strong> ${rating} / 5 ⭐</p>
                <p><strong>Category:</strong> ${category || "General"}</p>
                <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 15px;">
                  <p><strong>Message:</strong></p>
                  <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
                </div>
              </div>
              <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
                This is an automated notification from the TRYMI Feedback System.
              </p>
            </div>
          `,
        };

        await emailTransporter.sendMail(mailOptions);
        console.log(
          "✅ Feedback email sent successfully to sunnyvelaga219@gmail.com",
        );
      } catch (emailErr) {
        console.error("❌ Failed to send feedback email:", emailErr.message);
        console.error("   Error code:", emailErr.code);
        console.error("   Error response:", emailErr.response);
        // We don't fail the request if email fails, as feedback is already saved in DB
      }
    } else {
      console.warn("⚠️ Email service not available:");
      if (!emailEnabled) console.warn("   - emailEnabled is false");
      if (!emailTransporter)
        console.warn("   - emailTransporter is not initialized");
    }

    console.log("=".repeat(60) + "\n");

    res.status(201).json({
      success: true,
      message: "Thank you for your feedback!",
      feedbackId: feedback._id,
    });
  } catch (error) {
    console.error("❌ Feedback error:", error);
    console.error("   Stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
      error: error.message,
    });
  }
});

// Get User's Feedback
app.get("/api/feedback/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const feedbacks = await Feedback.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      feedbacks,
      count: feedbacks.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Admin: Get All Feedback
app.get("/api/feedback/all", async (req, res) => {
  try {
    const { status, limit = 100 } = req.query;
    const filter = status ? { status } : {};

    const feedbacks = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const stats = await Feedback.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      feedbacks,
      count: feedbacks.length,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Update Feedback Status
app.patch("/api/feedback/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, response } = req.body;

    const update = { status };
    if (response) {
      update.response = response;
      update.respondedAt = new Date();
    }

    const feedback = await Feedback.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    res.json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete Feedback
app.delete("/api/feedback/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = await Feedback.findByIdAndDelete(id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    res.json({
      success: true,
      message: "Feedback deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

console.log("✅ Feedback routes initialized");

// ============================================================
// ✅ 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.url,
    method: req.method,
  });
});

// ============================================================
// ✅ GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error("❌ UNHANDLED ERROR:", err.message);
  console.error("Stack:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
});

// ============================================================
// ✅ START SERVER
// ============================================================

const startServer = async () => {
  try {
    console.log("🚀 Starting TRYMI Backend Server...");

    // Initialize databases
    await initializeDatabases();

    // Initialize email service
    await initializeEmailService();

    app.listen(port, () => {
      console.log("\n" + "=".repeat(60));
      console.log("🎉 TRYMI Backend API Server");
      console.log("=".repeat(60));
      console.log(`📍 Status: running`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔌 Port: ${port}`);
      console.log(`🔗 URL: http://localhost:${port}`);
      console.log(`📦 API Products: http://localhost:${port}/api/products`);
      console.log(`🛍️  API Collections: http://localhost:${port}/api/collections`);
      console.log(`💝 API Wishlist: http://localhost:${port}/api/wishlist/:userId`);
      console.log(`🛒 API Cart: http://localhost:${port}/api/cart/:userId`);
      console.log(`🤖 API Chatbot: http://localhost:${port}/api/chatbot/chat`);
      console.log(`🎨 API Studio: http://localhost:${port}/api/studio/upload-photo`);
      console.log(`📧 API Send OTP: http://localhost:${port}/api/auth/send-otp`);
      console.log(`🤖 AI Service: ${PYTHON_AI_URL}`);
      console.log(
        `💾 Database: ${mongoose.connection.readyState === 1
          ? `✅ Connected (TRYMI / products & user_data)`
          : "❌ Disconnected"
        }`,
      );
      console.log(
        `🤖 AI Chatbot: ${chatbotEnabled
          ? "✅ Enabled (Llama 3.1 8B Instant)"
          : "❌ Disabled (Configure GROQ_API_KEY)"
        }`,
      );
      console.log(
        `📧 Email Service: ${emailEnabled
          ? `✅ Enabled (${process.env.EMAIL_USER})`
          : "❌ Disabled (Check configuration above)"
        }`,
      );
      console.log("=".repeat(60) + "\n");
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// ✅ REQUIRED for Vercel — export the app as default
export default app;