import mongoose from 'mongoose';

// Connect to MongoDB and explore the database
const exploreDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/borrowease', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database name: ${conn.connection.name}`);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nAvailable collections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Check each collection for documents containing 'approved'
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`\nChecking collection: ${collectionName}`);
      
      const documents = await mongoose.connection.db.collection(collectionName).find({}).limit(5).toArray();
      console.log(`Total documents in ${collectionName}:`, await mongoose.connection.db.collection(collectionName).countDocuments());
      
      if (documents.length > 0) {
        console.log('Sample document structure:');
        console.log(JSON.stringify(documents[0], null, 2));
        
        // Search for documents containing 'approved'
        for (const doc of documents) {
          const docStr = JSON.stringify(doc);
          if (docStr.includes('"approved"')) {
            console.log(`\nFound 'approved' in ${collectionName}:`);
            console.log(JSON.stringify(doc, null, 2));
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error exploring database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

exploreDB();
