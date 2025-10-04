// Test script to check contact messages in database
import mongoose from 'mongoose';
import ContactMessage from './models/contactModel.js';

// MongoDB connection
const MONGODB_URI = "mongodb://localhost:27017/borrowease";

const testContactMessages = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully');

    // Get all contact messages
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    console.log(`\n📧 Found ${messages.length} contact messages in database:`);
    
    messages.forEach((msg, index) => {
      console.log(`\n--- Message ${index + 1} ---`);
      console.log('ID:', msg._id.toString());
      console.log('From:', msg.name, '(' + msg.email + ')');
      console.log('Subject:', msg.subject);
      console.log('Status:', msg.status);
      console.log('Priority:', msg.priority);
      console.log('Category:', msg.category);
      console.log('Created:', msg.createdAt?.toLocaleString());
      console.log('Message Preview:', msg.message.substring(0, 100) + '...');
    });

    // Test message creation
    console.log('\n🧪 Testing message creation...');
    const testMessage = new ContactMessage({
      name: 'Test Admin Check',
      email: 'test@admin.com',
      subject: 'Admin Test Message',
      message: 'This is a test message to check if admin can see messages.',
      category: 'general',
      status: 'pending',
      priority: 'medium',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Script'
    });

    const savedMessage = await testMessage.save();
    console.log('✅ Test message created:', savedMessage._id.toString());

    // Verify message was saved
    const verifyMessage = await ContactMessage.findById(savedMessage._id);
    console.log('✅ Message verification successful:', !!verifyMessage);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Run the test
testContactMessages();
