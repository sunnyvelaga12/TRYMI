import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      // Removed select: false so we can access password for login
    },
    profileImage: {
      type: String,
      default: null,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer not to say", null], // ✅ FIXED: Added null to enum
      required: false,
      default: null,
    },
    age: {
      type: Number,
      min: [13, "Must be at least 13 years old"],
      max: [120, "Please enter a valid age"],
      required: false,
      default: null,
    },
    preferences: {
      favoriteCategories: {
        type: [String],
        default: [],
      },
      favoriteColors: {
        type: [String],
        default: [],
      },
      bodyType: {
        type: String,
        default: null,
      },
      stylePreference: {
        type: String,
        default: null,
      },
    },
    wishlist: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    cart: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    orders: [
      {
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        orderDate: {
          type: Date,
          default: Date.now,
        },
        total: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
          default: "pending",
        },
      },
    ],
    lastLogin: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true, // This automatically manages createdAt and updatedAt
  }
);

// Indexes for faster queries
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Pre-save hook to update lastLogin
userSchema.pre("save", function (next) {
  if (this.isNew) {
    this.lastLogin = new Date();
  }
  next();
});

// Method to exclude password when converting to JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find active users
userSchema.statics.findActiveUsers = function () {
  return this.find({ isActive: true });
};

// Virtual for full cart value (if products are populated)
userSchema.virtual("cartItemCount").get(function () {
  return this.cart.length;
});

// Virtual for wishlist count
userSchema.virtual("wishlistItemCount").get(function () {
  return this.wishlist.length;
});

export const User = mongoose.model("User", userSchema, "user_data");
