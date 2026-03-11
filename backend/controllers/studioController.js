const StudioPhoto = require('../models/StudioPhoto');
const TryOnResult = require('../models/TryOnResult');
const Product = require('../models/Product');
const axios = require('axios');

const AI_SERVICE_URL = process.env.PYTHON_AI_URL || process.env.AI_SERVICE_URL || 'https://trymi-ai.onrender.com';

const bufferToBase64 = (buffer, mimetype) => {
  return 'data:' + mimetype + ';base64,' + buffer.toString('base64');
};

exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });
    const base64Image = bufferToBase64(req.file.buffer, req.file.mimetype);
    const studioPhoto = new StudioPhoto({
      userId: req.body.userId || 'guest',
      photoUrl: base64Image,
      metadata: { size: req.file.size, mimetype: req.file.mimetype }
    });
    await studioPhoto.save();
    res.json({ success: true, photoId: studioPhoto._id, photoUrl: base64Image });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload photo', details: error.message });
  }
};

exports.uploadClothing = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No clothing image uploaded' });
    const base64Image = bufferToBase64(req.file.buffer, req.file.mimetype);
    res.json({ success: true, clothingUrl: base64Image, filename: req.file.originalname });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload clothing', details: error.message });
  }
};

exports.generateTryOn = async (req, res) => {
  try {
    const { photoId, productId, clothingImageUrl, clothingItems } = req.body;
    if (!photoId) return res.status(400).json({ error: 'Photo ID is required' });
    const studioPhoto = await StudioPhoto.findById(photoId);
    if (!studioPhoto) return res.status(404).json({ error: 'Studio photo not found' });
    let itemsToProcess = [];
    if (clothingItems) {
      itemsToProcess = typeof clothingItems === 'string' ? JSON.parse(clothingItems) : clothingItems;
    } else if (productId || clothingImageUrl) {
      itemsToProcess = [{ productId, clothingImageUrl, productName: req.body.productName, category: req.body.category }];
    }
    const resolvedItems = [];
    for (const item of itemsToProcess) {
      let imageUrl = item.clothingImageUrl;
      if (item.productId && !imageUrl) {
        const product = await Product.findById(item.productId);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        imageUrl = product.image;
        item.productName = product.name;
      }
      if (imageUrl) resolvedItems.push({ imageUrl, category: item.category || 'upper_body', title: item.productName || 'Clothing Item' });
    }
    if (resolvedItems.length === 0) return res.status(400).json({ error: 'No clothing images provided' });
    let resultImageUrl = studioPhoto.photoUrl;
    let processingTime = 0;
    try {
      const aiResp = await axios.get(AI_SERVICE_URL + '/health', { timeout: 5000 });
      if (aiResp.data && aiResp.data.status) {
        const startTime = Date.now();
        const aiResponse = await axios.post(AI_SERVICE_URL + '/api/generate-tryon', {
          personImageBase64: studioPhoto.photoUrl,
          clothingItems: resolvedItems
        }, { timeout: 300000 });
        processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
        if (aiResponse.data && aiResponse.data.success) {
          resultImageUrl = aiResponse.data.resultImageBase64 || aiResponse.data.resultImageUrl || studioPhoto.photoUrl;
        }
      }
    } catch (aiError) {
      console.warn('AI service unavailable, using original photo:', aiError.message);
    }
    const tryOnResult = new TryOnResult({
      userId: studioPhoto.userId,
      studioPhotoId: photoId,
      productId: productId || null,
      originalPhotoUrl: studioPhoto.photoUrl,
      clothingImageUrl: resolvedItems[0]?.imageUrl || '',
      resultImageUrl: resultImageUrl,
      processingTime: processingTime > 0 ? processingTime + 's' : undefined,
      status: 'completed'
    });
    await tryOnResult.save();
    res.json({ success: true, resultId: tryOnResult._id, resultImageUrl: resultImageUrl });
  } catch (error) {
    console.error('Try-on error:', error);
    res.status(500).json({ error: 'Failed to generate try-on', details: error.message });
  }
};

exports.getResult = async (req, res) => {
  try {
    const result = await TryOnResult.findById(req.params.resultId).populate('studioPhotoId').populate('productId');
    if (!result) return res.status(404).json({ error: 'Result not found' });
    res.json({ _id: result._id, originalPhotoUrl: result.studioPhotoId?.photoUrl || result.originalPhotoUrl, resultImageUrl: result.resultImageUrl, productId: result.productId?._id, productName: result.productId?.name, processingTime: result.processingTime, createdAt: result.createdAt, saved: result.saved });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch result', details: error.message });
  }
};

exports.saveLook = async (req, res) => {
  try {
    const result = await TryOnResult.findByIdAndUpdate(req.body.resultId, { saved: true }, { new: true });
    if (!result) return res.status(404).json({ error: 'Result not found' });
    res.json({ success: true, message: 'Look saved successfully', result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save look', details: error.message });
  }
};

exports.getMyLooks = async (req, res) => {
  try {
    const looks = await TryOnResult.find({ userId: req.params.userId, saved: true }).populate('productId').sort({ createdAt: -1 });
    res.json({ success: true, looks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch looks', details: error.message });
  }
};

exports.deleteLook = async (req, res) => {
  try {
    const result = await TryOnResult.findByIdAndDelete(req.params.resultId);
    if (!result) return res.status(404).json({ error: 'Result not found' });
    res.json({ success: true, message: 'Look deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete look', details: error.message });
  }
};

exports.getAllResults = async (req, res) => {
  try {
    const results = await TryOnResult.find({ userId: req.params.userId }).populate('productId').sort({ createdAt: -1 });
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch results', details: error.message });
  }
};

module.exports = exports;
