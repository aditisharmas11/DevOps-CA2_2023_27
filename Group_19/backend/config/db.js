const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    const dbName = conn.connection.name;
    console.log(`✅ MongoDB connected: ${conn.connection.host} / ${dbName}`);

    // Sync indexes for ALL registered models.
    // This forces Mongoose to create the collections in MongoDB immediately,
    // even before any document is inserted — solving "collections not visible" issue.
    mongoose.connection.once("open", async () => {
      const models = mongoose.modelNames();
      for (const name of models) {
        try {
          await mongoose.model(name).syncIndexes();
          console.log(`   📦 Collection ready: ${mongoose.model(name).collection.collectionName}`);
        } catch (e) {
          console.warn(`   ⚠️  syncIndexes failed for ${name}:`, e.message);
        }
      }
    });
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
