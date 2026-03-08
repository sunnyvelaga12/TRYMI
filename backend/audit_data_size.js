import mongoose from 'mongoose';
import { Product } from './models/Product.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trymi';

async function auditDataSize() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB for size audit...');

        const products = await Product.find({ status: 'active' }).lean();
        console.log(`Auditing ${products.length} active products...`);

        let totalSizeBytes = 0;
        let totalImageBytes = 0;
        let maxImageBytes = 0;

        products.forEach(p => {
            const json = JSON.stringify(p);
            const size = Buffer.byteLength(json, 'utf8');
            totalSizeBytes += size;

            if (p.image) {
                const imgSize = Buffer.byteLength(p.image, 'utf8');
                totalImageBytes += imgSize;
                if (imgSize > maxImageBytes) maxImageBytes = imgSize;
            }
        });

        console.log('--- AUDIT RESULTS ---');
        console.log(`Total Payload Size: ${(totalSizeBytes / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Average Product Size: ${(totalSizeBytes / products.length / 1024).toFixed(2)} KB`);
        console.log(`Total Image Data: ${(totalImageBytes / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Average Image Size: ${(totalImageBytes / products.length / 1024).toFixed(2)} KB`);
        console.log(`Max Individual Image Size: ${(maxImageBytes / 1024 / 1024).toFixed(2)} MB`);

        if (totalSizeBytes > 10 * 1024 * 1024) {
            console.log('⚠️ WARNING: Large payload detected (>10MB). This is likely causing the timeout.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Audit failed:', err);
        process.exit(1);
    }
}

auditDataSize();
