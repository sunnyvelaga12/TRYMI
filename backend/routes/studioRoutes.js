const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const studioController = require('../controllers/studioController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/studio-photos/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Routes
router.post('/upload-photo', upload.single('photo'), studioController.uploadPhoto);
router.post('/upload-clothing', upload.single('clothingImage'), studioController.uploadClothing);
router.post('/generate-tryon', studioController.generateTryOn);
router.get('/result/:resultId', studioController.getResult);
router.post('/save-look', studioController.saveLook);
router.get('/my-looks/:userId', studioController.getMyLooks);
router.delete('/delete-look/:resultId', studioController.deleteLook);

module.exports = router;
