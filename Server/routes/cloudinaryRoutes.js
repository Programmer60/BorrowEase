import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { verifyToken } from '../firebase.js';

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.VITE_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/sign-upload
router.post('/sign-upload', verifyToken, (req, res) => {
  const timestamp = Math.round((new Date()).getTime() / 1000);
  const folder = 'borrowease/kyc/documents';
  
  // Only sign the parameters that will be sent in the upload request
  const params_to_sign = {
    timestamp,
    folder,
  };
  
  const signature = cloudinary.utils.api_sign_request(
    params_to_sign,
    process.env.CLOUDINARY_API_SECRET
  );
  
  // Only send back the signature, timestamp, and folder
  res.json({
    timestamp,
    signature,
    folder,
  });
});

// POST /api/sign-view-url - Generate signed URL for viewing documents
router.post('/sign-view-url', verifyToken, (req, res) => {
  try {
    const { publicId } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }
    
    // Generate a signed URL with expiration (valid for 1 hour)
    const signedUrl = cloudinary.utils.private_download_link_by_public_id(
      publicId,
      'auto', // format
      {
        expires_at: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
      }
    );
    
    res.json({ signedUrl });
  } catch (error) {
    console.error('Error generating signed view URL:', error);
    res.status(500).json({ error: 'Failed to generate signed view URL' });
  }
});

export default router;
