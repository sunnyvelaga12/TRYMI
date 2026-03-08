import mongoose from "mongoose";

const tryOnResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  photoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StudioPhoto",
    required: true,
  },
  productId: {
    type: String, // Can be ObjectId or string product ID
    default: null,
  },
  clothingImageUrl: String,
  resultImageUrl: {
    type: String,
    required: true,
  },
  animatedUrl: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  saved: {
    type: Boolean,
    default: false,
  },
});

export const TryOnResult = mongoose.model("TryOnResult", tryOnResultSchema, "tryon_results");
