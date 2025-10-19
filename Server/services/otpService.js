/**
 * OTP Service - Using Twilio Verify API (Recommended)
 * No phone number needed, Twilio handles OTP generation automatically
 */

import twilio from 'twilio';

// Initialize Twilio client
let twilioClient = null;

// Redis client setup (will be initialized in server.js)
let redisClient = null;

// OTP Configuration
const OTP_CONFIG = {
    EXPIRY: 5 * 60, // 5 minutes in seconds (Twilio manages this)
    MAX_ATTEMPTS: 3, // Twilio manages this
    RATE_LIMIT: {
        MAX_REQUESTS: 3,
        WINDOW: 60 * 60 // 1 hour
    }
};

/**
 * Initialize Twilio Verify client
 */
const initTwilio = () => {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const verifySid = process.env.TWILIO_VERIFY_SID;

        if (!accountSid || !authToken || !verifySid) {
            console.warn('⚠️ Twilio Verify credentials not configured');
            console.warn('   Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID');
            return false;
        }

        twilioClient = twilio(accountSid, authToken);
        console.log('✅ Twilio Verify API initialized');
        console.log(`   Verify Service SID: ${verifySid.substring(0, 4)}...${verifySid.substring(verifySid.length - 4)}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Twilio:', error.message);
        return false;
    }
};

/**
 * Initialize Redis client
 */
const initRedis = (client) => {
    redisClient = client;
    console.log('✅ OTP Service: Redis client initialized');
};

/**
 * Check rate limit for phone number
 */
const checkRateLimit = async (phone) => {
    if (!redisClient) {
        return true; // Skip rate limiting if Redis not available
    }

    try {
        const key = `rate_limit:${phone}`;
        const data = await redisClient.get(key);

        if (!data) {
            // First request
            await redisClient.setEx(
                key,
                OTP_CONFIG.RATE_LIMIT.WINDOW,
                JSON.stringify({ count: 1, firstRequest: Date.now() })
            );
            return true;
        }

        const limitData = JSON.parse(data);
        
        if (limitData.count >= OTP_CONFIG.RATE_LIMIT.MAX_REQUESTS) {
            const timeElapsed = Date.now() - limitData.firstRequest;
            const timeRemaining = Math.ceil((OTP_CONFIG.RATE_LIMIT.WINDOW * 1000 - timeElapsed) / 60000);
            throw new Error(`Rate limit exceeded. Try again in ${timeRemaining} minutes.`);
        }

        // Increment counter
        limitData.count += 1;
        const ttl = await redisClient.ttl(key);
        await redisClient.setEx(key, ttl, JSON.stringify(limitData));
        
        return true;
    } catch (error) {
        if (error.message.includes('Rate limit')) {
            throw error;
        }
        console.error('❌ Error checking rate limit:', error);
        return true; // Allow on error
    }
};

/**
 * Validate phone number format
 */
const validatePhone = (phone) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Check if it's a valid length (10-15 digits)
    if (cleaned.length < 10 || cleaned.length > 15) {
        return false;
    }
    
    return true;
};

/**
 * Normalize phone number to E.164 format
 */
const normalizePhone = (phone) => {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Add +91 for Indian numbers if not present
    if (!cleaned.startsWith('+')) {
        const digits = cleaned.replace(/\D/g, '');
        if (digits.length === 10) {
            // Indian 10-digit number
            cleaned = '+91' + digits;
        } else if (digits.length === 12 && digits.startsWith('91')) {
            // Already has 91 prefix
            cleaned = '+' + digits;
        } else {
            // Assume it needs +91
            cleaned = '+91' + digits;
        }
    }
    
    return cleaned;
};

/**
 * Send OTP using Twilio Verify API
 */
const sendOTP = async (phone) => {
    try {
        // Validate phone
        if (!validatePhone(phone)) {
            throw new Error('Invalid phone number format');
        }

        // Normalize phone
        const normalizedPhone = normalizePhone(phone);

        // Check rate limit
        await checkRateLimit(normalizedPhone);

        // Initialize Twilio if not already done
        if (!twilioClient) {
            const initialized = initTwilio();
            if (!initialized) {
                throw new Error('Twilio Verify not configured. Please contact support.');
            }
        }

        // Send OTP using Twilio Verify API
        const verification = await twilioClient.verify.v2
            .services(process.env.TWILIO_VERIFY_SID)
            .verifications.create({
                to: normalizedPhone,
                channel: 'sms'
            });

        console.log(`✅ OTP sent to ${normalizedPhone} via Twilio Verify`);
        console.log(`   Status: ${verification.status}`);
        console.log(`   SID: ${verification.sid}`);

        return {
            success: true,
            phone: normalizedPhone,
            status: verification.status,
            expiresIn: '5 minutes',
            provider: 'twilio-verify'
        };
    } catch (error) {
        console.error('❌ Error sending OTP:', error);
        
        if (error.code === 60200) {
            throw new Error('Invalid phone number');
        } else if (error.code === 60203) {
            throw new Error('Max send attempts reached. Please try again later.');
        } else if (error.message && error.message.includes('Rate limit')) {
            throw error;
        } else {
            throw new Error('Failed to send OTP: ' + (error.message || 'Unknown error'));
        }
    }
};

/**
 * Verify OTP using Twilio Verify API
 */
const verifyOTP = async (phone, otp) => {
    try {
        // Validate inputs
        if (!phone || !otp) {
            throw new Error('Phone number and OTP are required');
        }

        // Normalize phone
        const normalizedPhone = normalizePhone(phone);

        // Validate OTP format (6 digits)
        if (!/^\d{4,8}$/.test(otp)) {
            throw new Error('Invalid OTP format');
        }

        // Initialize Twilio if not already done
        if (!twilioClient) {
            const initialized = initTwilio();
            if (!initialized) {
                throw new Error('Twilio Verify not configured. Please contact support.');
            }
        }

        // Verify OTP using Twilio Verify API
        const verificationCheck = await twilioClient.verify.v2
            .services(process.env.TWILIO_VERIFY_SID)
            .verificationChecks.create({
                to: normalizedPhone,
                code: otp
            });

        console.log(`✅ OTP verification for ${normalizedPhone}`);
        console.log(`   Status: ${verificationCheck.status}`);

        if (verificationCheck.status === 'approved') {
            return {
                success: true,
                message: 'Phone number verified successfully',
                phone: normalizedPhone
            };
        } else {
            return {
                success: false,
                message: 'Invalid or expired OTP',
                status: verificationCheck.status
            };
        }
    } catch (error) {
        console.error('❌ Error verifying OTP:', error);
        
        if (error.code === 60200) {
            throw new Error('Invalid phone number');
        } else if (error.code === 60202) {
            throw new Error('Max verification attempts reached');
        } else if (error.code === 60223) {
            throw new Error('Invalid or expired OTP');
        } else {
            throw new Error('Failed to verify OTP: ' + (error.message || 'Unknown error'));
        }
    }
};

/**
 * Resend OTP (same as sending new OTP with Twilio Verify)
 */
const resendOTP = async (phone) => {
    try {
        console.log(`🔄 Resending OTP to ${phone}`);
        return await sendOTP(phone);
    } catch (error) {
        console.error('❌ Error in resendOTP:', error);
        throw error;
    }
};

// Initialize Twilio on module load
initTwilio();

export {
    initRedis,
    sendOTP as generateAndSendOTP, // Alias for compatibility
    verifyOTP,
    resendOTP,
    OTP_CONFIG
};
