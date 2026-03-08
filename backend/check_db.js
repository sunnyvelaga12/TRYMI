import mongoose from 'mongoose';
import { Product } from './models/Product.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trymi';

mongoose.connect(MONGODB_URI).then(async () => {
    const count = await Product.countDocuments();
    console.log('Total products in DB:', count);
    const countActive = await Product.countDocuments({ status: 'active' });
    console.log('Active products in DB:', countActive);

    // Also check the raw collections to see if they're separated
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    process.exit(0);
}).catch(console.error);
