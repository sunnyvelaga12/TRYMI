import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters long"],
    },
    category: {
      type: String,
      required: true,
      lowercase: true,
      enum: {
        values: [
          "shirts", "tshirts", "pants", "kids-shirts", "kids-pants",
          "top", "bottom", "dress", "dresses",
          "jacket", "jackets", "shoes", "bag", "accessories"
        ],
        message: "{VALUE} is not a valid category",
      },
    },
    gender: {
      type: String,
      required: false,
      enum: {
        values: ["mens", "womens", "unisex", "all"],
        message: "{VALUE} is not a valid gender",
      },
      default: "unisex",
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    priceRange: {
      type: String,
      required: false,
    },
    colors: [
      {
        type: String,
        trim: true,
      },
    ],
    image: {
      type: String,
      required: [true, "Product image is required"],
    },
    imageUrl: {
      type: String,
    },
    emoji: {
      type: String,
      default: function () {
        const emojiMap = {
          shirts: "👔",
          tshirts: "👕",
          top: "👕",
          bottom: "👖",
          dress: "👗",
          dresses: "👗",
          jacket: "🧥",
          jackets: "🧥",
          shoes: "👟",
          bag: "👜",
          accessories: "👜",
        };
        return emojiMap[this.category] || "👕";
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "active",
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    stock: {
      type: Number,
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    sizes: [
      {
        type: String,
        trim: true,
      },
    ],
    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
productSchema.index({ category: 1, status: 1 });
productSchema.index({ gender: 1, status: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ name: "text", description: "text" });

// Virtual for URL-friendly slug
productSchema.virtual("slug").get(function () {
  return this.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
});

// Instance method to check if product is in stock
productSchema.methods.isInStock = function () {
  return this.stock > 0;
};

// Static method to find active products by category
productSchema.statics.findByCategory = function (category) {
  return this.find({
    category: { $regex: new RegExp(category, "i") },
    status: "active",
  });
};

// Static method to find products for Virtual Try-On
productSchema.statics.findForTryOn = function () {
  return this.find({
    status: "active",
    inStock: true,
  }).select(
    "name category image imageUrl price emoji description sizes colors"
  );
};

export const Product = mongoose.model("Product", productSchema, "products");
