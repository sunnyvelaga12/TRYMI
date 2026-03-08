import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function restoreProducts() {
    try {
        console.log('🔄 Connecting to MongoDB Atlas...');
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI not found in .env');

        await mongoose.connect(uri);
        console.log('✅ Connected!');

        // Path to the JSON file provided by the user
        const jsonPath = "C:/Users/sunny/OneDrive/Desktop/templates for trymi/TRYMI.products_upto_womens_shirts.json";

        if (!fs.existsSync(jsonPath)) {
            throw new Error(`File not found: ${jsonPath}`);
        }

        console.log('📁 Reading JSON file...');
        const jsonData = fs.readFileSync(jsonPath, 'utf8');
        const products = JSON.parse(jsonData);

        console.log(`📊 Found ${products.length} products in JSON`);

        // Use a flexible schema to avoid validation errors for legacy data
        const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products');

        console.log('🗑️ Clearing existing products from "products" collection...');
        const deleteResult = await Product.deleteMany({});
        console.log(`✅ Cleared ${deleteResult.deletedCount} products.`);

        console.log(`📤 Restoring ${products.length} products...`);

        let importedCount = 0;
        let skippedCount = 0;

        for (const product of products) {
            try {
                // 1. Handle MongoDB Extended JSON formats (_id: { $oid: "..." })
                if (product._id && product._id.$oid) {
                    product._id = product._id.$oid;
                }

                // 2. Handle Date fields
                if (product.createdAt && product.createdAt.$date) {
                    product.createdAt = new Date(product.createdAt.$date);
                }
                if (product.updatedAt && product.updatedAt.$date) {
                    product.updatedAt = new Date(product.updatedAt.$date);
                }

                // 3. Handle __v if present
                if (product.__v !== undefined) {
                    delete product.__v;
                }

                await Product.create(product);
                importedCount++;
                if (importedCount % 50 === 0) {
                    console.log(`✅ Progress: ${importedCount}/${products.length}...`);
                }
            } catch (err) {
                console.error(`❌ Error importing product "${product.name || 'Unknown'}":`, err.message);
                skippedCount++;
            }
        }

        console.log(`\n🎉 RESTORATION COMPLETE!`);
        console.log(`✅ Successfully restored: ${importedCount}`);
        console.log(`⚠️ Skipped/Errors: ${skippedCount}`);

    } catch (error) {
        console.error('❌ FATAL ERROR:', error.message);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('🔌 Connection closed.');
        }
    }
}

restoreProducts();
