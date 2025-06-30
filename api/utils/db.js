const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI chưa được thiết lập - app sẽ chạy mà không có database');
    return false;
  }
  
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    });
    
    console.log('✅ Kết nối MongoDB Atlas thành công');
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
    return true;
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB Atlas:', error);
    return false;
  }
}

module.exports = { connectDB }; 