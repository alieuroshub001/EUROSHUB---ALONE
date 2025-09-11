const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Check for different possible environment variable names
    const mongoUri = process.env.MONGODB_URI || 
                     process.env.MONGO_URI || 
                     process.env.DATABASE_URL ||
                     process.env.MONGOLAB_URI ||
                     process.env.MONGOHQ_URL;

    if (!mongoUri) {
      console.error('MongoDB connection string is missing. Please set one of the following environment variables:');
      console.error('- MONGODB_URI');
      console.error('- MONGO_URI');
      console.error('- DATABASE_URL');
      console.error('Current environment variables related to MongoDB:');
      console.error('MONGODB_URI:', process.env.MONGODB_URI);
      console.error('MONGO_URI:', process.env.MONGO_URI);
      console.error('DATABASE_URL:', process.env.DATABASE_URL);
      process.exit(1);
    }

    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    console.error('Make sure your MongoDB connection string is correct and the database is accessible');
    process.exit(1);
  }
};

module.exports = connectDB;