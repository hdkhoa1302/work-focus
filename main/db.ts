import mongoose from 'mongoose';
import { config as loadEnv } from 'dotenv';

// Load biến môi trường từ .env
loadEnv();

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI chưa được thiết lập');
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log('✅ Kết nối MongoDB Atlas thành công');
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB Atlas:', error);
  }
} 