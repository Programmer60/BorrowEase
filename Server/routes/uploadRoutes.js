import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { verifyToken } from '../middleware/adminAuth.js';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dbvse3x8p',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'), false);
    }
  }
});

// Upload endpoint
router.post('/kyc-document', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { documentType } = req.body;
    
    console.log('Uploading file:', {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      documentType: documentType
    });

    // Determine resource type based on file type
    const isPDF = req.file.mimetype === 'application/pdf';
    const resourceType = isPDF ? 'raw' : 'image';

    // Upload to Cloudinary
    const uploadOptions = {
      resource_type: resourceType,
      folder: 'borrowease/kyc',
      public_id: `${req.user.uid}_${documentType}_${Date.now()}`,
      tags: ['kyc', documentType, req.user.uid]
    };

    // For images, add transformation options
    if (!isPDF) {
      uploadOptions.transformation = [
        { quality: 'auto', fetch_format: 'auto' },
        { width: 1200, height: 1200, crop: 'limit' }
      ];
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      uploadStream.end(req.file.buffer);
    });

    console.log('Upload successful:', {
      public_id: result.public_id,
      secure_url: result.secure_url,
      resource_type: result.resource_type,
      format: result.format,
      bytes: result.bytes
    });

    res.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      fileInfo: {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        sizeText: req.file.size > 1024 * 1024 
          ? `${(req.file.size / (1024 * 1024)).toFixed(1)}MB`
          : `${Math.round(req.file.size / 1024)}KB`
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
});

export default router;
