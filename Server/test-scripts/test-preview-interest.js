// Test script for the preview-interest endpoint
import axios from 'axios';

async function testPreviewInterest() {
    try {
        // Test data for preview interest calculation
        const testData = {
            loanAmount: 10000,
            tenure: 12,
            purpose: "Personal"
        };

        console.log('🧪 Testing preview-interest endpoint...');
        console.log('📋 Test data:', testData);

        // Make request to preview-interest endpoint (no auth required for preview)
        const response = await axios.post('http://localhost:5000/api/loans/preview-interest', testData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Preview Interest Response:', response.data);
        console.log('💰 Interest Rate:', response.data.interestRate);
        console.log('💳 EMI:', response.data.emi);
        console.log('💸 Total Amount:', response.data.totalAmount);

    } catch (error) {
        console.error('❌ Preview Interest Error:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
    }
}

// Test without authentication first
testPreviewInterest();
