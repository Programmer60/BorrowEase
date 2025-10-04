import { MongoClient } from 'mongodb';

const mongoUri = "mongodb://localhost:27017";
const dbName = "BorrowEase";

async function checkUserNames() {
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    
    const db = client.db(dbName);
    const users = await db.collection('users').find({}).toArray();
    
    console.log("\n=== ALL USERS IN DATABASE ===");
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   Name: "${user.name}"`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ---`);
    });
    
    // Check if there are any loans to see which users are involved
    const loans = await db.collection('loans').find({ funded: true }).toArray();
    console.log("\n=== FUNDED LOANS ===");
    loans.forEach((loan, index) => {
      console.log(`${index + 1}. Loan ID: ${loan._id}`);
      console.log(`   Borrower ID: ${loan.borrowerId}`);
      console.log(`   Lender ID: ${loan.lenderId}`);
      console.log(`   Amount: ₹${loan.amount}`);
      console.log(`   Purpose: ${loan.purpose}`);
      console.log(`   ---`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

checkUserNames();
