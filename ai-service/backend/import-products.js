import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function importProducts() {
    try {
        console.log('🔄 Connecting to Atlas TRYMI...');

        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI not found in .env');

        await mongoose.connect(uri);
        console.log('✅ Connected!');

        // Flexible schema
        const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));

        console.log('📁 Reading JSON file...');
        const jsonPath = 'C:/Users/sunny/OneDrive/Desktop/templates for tumni/TRYMI.products.1.json'; // Note: User path might be different, let me check
        // Wait, I saw "templates for trymi" earlier
        const correctPath = 'C:/Users/sunny/OneDrive/Desktop/templates for trymi/TRYMI.products.1.json';

        if (!fs.existsSync(correctPath)) {
            throw new Error(`File not found: ${correctPath}`);
        }

        const jsonData = fs.readFileSync(correctPath, 'utf8');
        const products = JSON.parse(jsonData);

        console.log(`📊 Found ${products.length} products in JSON`);

        console.log('🗑️  Clearing existing products...');
        await Product.deleteMany({});

        console.log(`📤 Importing ${products.length} products...`);

        let importedCount = 0;
        let skippedCount = 0;

        for (const product of products) {
            try {
                // 1. Handle MongoDB Extended JSON formats (_id: { $oid: "..." })
                if (product._id && product._id.$oid) {
                    product._id = product._id.$oid;
                }

                // 2. Clear any other $ fields that might be present in a Compass export
                for (const key in product) {
                    if (product[key] && typeof product[key] === 'object' && product[key].$numberDecimal) {
                        product[key] = parseFloat(product[key].$numberDecimal);
                    } else if (product[key] && typeof product[key] === 'object' && product[key].$date) {
                        product[key] = new Date(product[key].$date);
                    }
                }

                // 3. Size check
                const size = Buffer.byteLength(JSON.stringify(product));
                if (size > 15 * 1024 * 1024) {
                    console.warn(`⚠️ Skipping "${product.name || product.title || 'Unknown'}" - Too Large (${(size / 1024 / 1024).toFixed(2)} MB)`);
                    skippedCount++;
                    continue;
                }

                await Product.create(product);
                importedCount++;
                if (importedCount % 10 === 0) {
                    console.log(`✅ Progress: ${importedCount}/${products.length} ...`);
                }
            } catch (err) {
                console.error(`❌ Error importing product:`, err.message);
                skippedCount++;
            }
        }

        console.log(`✅ FINISHED! ${importedCount} imported, ${skippedCount} skipped.`);
        console.log('🌐 Test API: http://localhost:3000/api/products');

    } catch (error) {
        console.error('❌ FATAL ERROR:', error.message);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        console.log('🔌 Disconnected');
    }
}

importProducts();
