import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from './models/Product.js';

dotenv.config();

const app = express();

// Middleware - FIXED: Added port 3001 for CORS + Increased body size limit
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trymi';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected to:', MONGODB_URI);
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// ==================== API ROUTES ====================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'TRYMI API is running',
    timestamp: new Date().toISOString()
  });
});

// GET all products - /api/collections
app.get('/api/collections', async (req, res) => {
  try {
    const { gender } = req.query;
    console.log(`📡 [INDEX.JS] /api/collections: Fetching (Gen: ${gender})`);

    const query = { status: 'active' };
    if (gender && gender !== 'all') query.gender = gender;

    const products = await Product.find(query)
      .select('_id name category gender price priceRange image description colors sizes emoji status')
      .sort({ createdAt: -1 })
      .lean();

    const sanitized = products.map(p => ({
      ...p,
      _id: p._id.toString(),
      title: p.name || p.title
    }));

    console.log(`✅ [INDEX.JS] /api/collections: Found ${sanitized.length} items`);

    res.json({
      success: true,
      count: sanitized.length,
      data: sanitized,
      source: 'index.js'
    });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      message: error.message
    });
  }
});

// GET all products - /api/products (Alias for AdminDashboard)
app.get('/api/products', async (req, res) => {
  try {
    const { category, gender } = req.query;
    console.log(`📡 [INDEX.JS] /api/products: Fetching (Cat: ${category}, Gen: ${gender})`);

    const query = { status: 'active' };
    if (category && category !== 'all') query.category = category;
    if (gender && gender !== 'all') query.gender = gender;

    const products = await Product.find(query)
      .select('_id name category gender price priceRange image description colors sizes emoji status')
      .sort({ createdAt: -1 })
      .lean();

    const sanitized = products.map(p => ({
      ...p,
      _id: p._id.toString(),
      title: p.name || p.title
    }));

    console.log(`✅ [INDEX.JS] /api/products: Found ${sanitized.length} items`);

    res.json({
      success: true,
      count: sanitized.length,
      data: sanitized,
      source: 'index.js'
    });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      message: error.message
    });
  }
});

// GET products by category
app.get('/api/collections/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({
      category: { $regex: new RegExp(category, 'i') },
      status: 'active'
    });

    console.log(`📦 API: Fetched ${products.length} products for category: ${category}`);
    res.json(products);
  } catch (error) {
    console.error('❌ Error fetching products by category:', error);
    res.status(500).json({
      error: 'Failed to fetch products',
      message: error.message
    });
  }
});

// GET single product by ID
app.get('/api/collections/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    res.status(500).json({
      error: 'Failed to fetch product',
      message: error.message
    });
  }
});

// POST create new product - /api/collections
app.post('/api/collections', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    console.log('✅ New product created:', product.name);
    res.status(201).json(product);
  } catch (error) {
    console.error('❌ Error creating product:', error);
    res.status(400).json({
      error: 'Failed to create product',
      message: error.message
    });
  }
});

// POST create new product - /api/products (Alias for AdminDashboard)
app.post('/api/products', async (req, res) => {
  try {
    console.log('📥 Received product data:', req.body);

    // ✅ Extract price from priceRange if price is not provided
    let price = req.body.price;

    if (!price && req.body.priceRange) {
      // Try to extract number from priceRange string (e.g., "$259", "259 rupees", "259")
      const priceMatch = req.body.priceRange.match(/\d+(\.\d+)?/);
      if (priceMatch) {
        price = parseFloat(priceMatch[0]);
        console.log(`💰 Extracted price ${price} from priceRange: ${req.body.priceRange}`);
      }
    }

    // If still no price, set a default
    if (!price) {
      price = 0;
      console.log('⚠️ No price found, defaulting to 0');
    }

    const productData = {
      ...req.body,
      name: req.body.name || req.body.title, // Support both name and title
      price: price, // Use extracted or provided price
      title: undefined, // Remove title field (use name instead)
    };

    console.log('📝 Processed product data:', {
      name: productData.name,
      price: productData.price,
      category: productData.category
    });

    const product = new Product(productData);
    await product.save();
    console.log('✅ New product created via /api/products:', product.name, `Price: $${product.price}`);
    res.status(201).json(product);
  } catch (error) {
    console.error('❌ Error creating product:', error);
    console.error('❌ Error details:', error.message);
    res.status(400).json({
      error: 'Failed to create product',
      message: error.message
    });
  }
});

// 404 handler - MUST BE AFTER ALL ROUTES
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('==========================================');
  console.log(`🚀 TRYMI Backend Server Running`);
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`📦 API: http://localhost:${PORT}/api/collections`);
  console.log(`📦 API: http://localhost:${PORT}/api/products`);
  console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
  console.log('==========================================');
});

export default app;
