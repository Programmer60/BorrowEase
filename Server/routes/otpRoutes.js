/**
 * OTP Routes - Handle phone verification endpoints
 */

import express from 'express';
import { 
    generateAndSendOTP, 
    verifyOTP, 
    resendOTP 
} from '../services/otpService.js';

const router = express.Router();

/**
 * @route   POST /api/otp/send
 * @desc    Send OTP to phone number
 * @access  Public
 */
router.post('/send', async (req, res) => {
    try {
        const { phone } = req.body;

        // Validation
        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        // Normalize phone number (add +91 if not present for India)
        let normalizedPhone = phone.trim();
        if (!normalizedPhone.startsWith('+')) {
            normalizedPhone = '+91' + normalizedPhone;
        }

        console.log(`📱 OTP request for: ${normalizedPhone}`);

        // Generate and send OTP
        const result = await generateAndSendOTP(normalizedPhone);

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            data: {
                phone: normalizedPhone,
                expiresIn: result.expiresIn,
                provider: result.provider
            }
        });

    } catch (error) {
        console.error('❌ Send OTP error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send OTP'
        });
    }
});

/**
 * @route   POST /api/otp/verify
 * @desc    Verify OTP
 * @access  Public
 */
router.post('/verify', async (req, res) => {
    try {
        const { phone, otp } = req.body;

        // Validation
        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and OTP are required'
            });
        }

        // Normalize phone number
        let normalizedPhone = phone.trim();
        if (!normalizedPhone.startsWith('+')) {
            normalizedPhone = '+91' + normalizedPhone;
        }

        console.log(`🔐 OTP verification attempt for: ${normalizedPhone}`);

        // Verify OTP
        const result = await verifyOTP(normalizedPhone, otp.trim());

        if (result.success) {
            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    phone: normalizedPhone,
                    verified: true
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
                attemptsRemaining: result.attemptsRemaining
            });
        }

    } catch (error) {
        console.error('❌ Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify OTP'
        });
    }
});

/**
 * @route   POST /api/otp/resend
 * @desc    Resend OTP
 * @access  Public
 */
router.post('/resend', async (req, res) => {
    try {
        const { phone } = req.body;

        // Validation
        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        // Normalize phone number
        let normalizedPhone = phone.trim();
        if (!normalizedPhone.startsWith('+')) {
            normalizedPhone = '+91' + normalizedPhone;
        }

        console.log(`🔄 OTP resend request for: ${normalizedPhone}`);

        // Resend OTP
        const result = await resendOTP(normalizedPhone);

        res.status(200).json({
            success: true,
            message: 'OTP resent successfully',
            data: {
                phone: normalizedPhone,
                expiresIn: result.expiresIn,
                provider: result.provider
            }
        });

    } catch (error) {
        console.error('❌ Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to resend OTP'
        });
    }
});

/**
 * @route   GET /api/otp/test
 * @desc    Test OTP service (development only)
 * @access  Public
 */
router.get('/test', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            success: false,
            message: 'Test endpoint not available in production'
        });
    }

    res.status(200).json({
        success: true,
        message: 'OTP service is running',
        config: {
            provider: process.env.SMS_PROVIDER || 'twilio',
            twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
            msg91Configured: !!process.env.MSG91_AUTH_KEY,
            redisConfigured: !!process.env.REDIS_URL
        }
    });
});

export default router;
