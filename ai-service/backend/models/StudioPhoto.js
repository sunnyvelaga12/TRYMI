import mongoose from 'mongoose';

const studioPhotoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  photoUrl: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  processedPhotoUrl: String, // After background removal, pose detection
  metadata: {
    width: Number,
    height: Number,
    format: String
  }
});

export const StudioPhoto = mongoose.model("StudioPhoto", studioPhotoSchema, "studio_photos");
