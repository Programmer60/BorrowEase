import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  ArrowLeft, 
  Upload, 
  FileText, 
  Camera, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  User,
  MapPin,
  CreditCard,
  Phone,
  Eye,
  X,
  Calendar,
  Home,
  ExternalLink,
  Smartphone,
  Globe,
  Award,
  Lock,
  Zap
} from 'lucide-react';
import Navbar from './Navbar';
import API from '../api/api';
import { auth } from '../firebase';
import { onAuthStateChanged, RecaptchaVerifier, PhoneAuthProvider, linkWithCredential } from 'firebase/auth';
import { useTheme } from '../contexts/ThemeContext';

// Enhanced ValidationSummary Component for better UX
const ValidationSummary = ({ errors, isDark }) => {
  const errorEntries = Object.entries(errors).filter(([key, value]) => value);
  
  if (errorEntries.length === 0) return null;
  
  return (
    <div className={`mb-6 p-4 rounded-lg border ${
      isDark ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
    }`}>
      <div className="flex items-center mb-2">
        <AlertCircle className="w-5 h-5 mr-2" />
        <h3 className="font-medium">Please fix the following issues:</h3>
      </div>
      <ul className="list-disc list-inside space-y-1 text-sm">
        {errorEntries.map(([key, error]) => (
          <li key={key}>{error}</li>
        ))}
      </ul>
    </div>
  );
};
const DocumentUploadCard = ({ 
  type, 
  title, 
  description, 
  icon: Icon, 
  required = true,
  kycData,
  errors,
  handleFileUpload,
  formattedAadhar,
  setFormattedAadhar,
  setKycData,
  setErrors,
  openImagePreview,
  uploadProgress,
  retryUpload,
  isDark
}) => {
  const doc = kycData.documents[type] || { file: null, number: '', preview: null };
  const error = errors[`documents.${type}`];
  
  // Define requirements for each document type - PRODUCTION LEVEL
  const requirements = {
    aadharCard: {
      size: '100KB - 2MB',
      resolution: 'Minimum 800x500px, landscape orientation',
      format: 'JPEG, PNG',
      tips: 'Ensure both sides are clearly visible, no glare or blur, and all details are readable.'
    },
    panCard: {
      size: '100KB - 2MB',
      resolution: 'Minimum 800x500px, landscape orientation',
      format: 'JPEG, PNG',
      tips: 'Upload a clear image with all text and photo visible. Avoid cropped or unclear images.'
    },
    selfie: {
      size: '50KB - 3MB',
      resolution: 'Minimum 400x400px, portrait orientation',
      format: 'JPEG, PNG',
      tips: 'Take a selfie in good lighting, holding your Aadhar card next to your face. Face and card details must be visible.'
    },
    bankStatement: {
      size: '100KB - 5MB',
      resolution: 'Minimum 600x800px, portrait orientation',
      format: 'JPEG, PNG',
      tips: 'Upload a clear image of your latest bank statement showing transactions and account details.'
    },
    salarySlip: {
      size: '100KB - 5MB',
      resolution: 'Minimum 600x800px, portrait orientation',
      format: 'JPEG, PNG',
      tips: 'Upload a clear image of your latest salary slip showing earnings and deductions.'
    }
  };

  const req = requirements[type];
  
  return (
    <div className={`border-2 border-dashed rounded-xl p-6 transition-all ${
      doc.file 
        ? isDark ? 'border-green-400 bg-green-900/20' : 'border-green-500 bg-green-50'
        : error 
        ? isDark ? 'border-red-400 bg-red-900/20' : 'border-red-500 bg-red-50'
        : isDark ? 'border-gray-600 hover:border-blue-400 bg-gray-800/50' : 'border-gray-300 hover:border-blue-500'
    }`}>
      <div className="text-center">
        <Icon className={`w-12 h-12 mx-auto mb-4 ${
          doc.file 
            ? isDark ? 'text-green-400' : 'text-green-600'
            : isDark ? 'text-gray-500' : 'text-gray-400'
        }`} />
        <h3 className={`text-lg font-semibold mb-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>{title}</h3>
        <p className={`text-sm mb-4 ${
          isDark ? 'text-gray-300' : 'text-gray-600'
        }`}>{description}</p>
        
        {/* Requirements Display */}
        <div className={`mb-4 p-3 rounded-lg text-left ${
          isDark ? 'bg-gray-700/50' : 'bg-gray-50'
        }`}>
          <h4 className={`text-xs font-semibold mb-2 uppercase tracking-wide ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>Requirements:</h4>
          <div className={`space-y-1 text-xs ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {req ? (
              <>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  <span><strong>Size:</strong> {req.size}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  <span><strong>Resolution:</strong> {req.resolution}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                  <span><strong>Format:</strong> {req.format}</span>
                </div>
              </>
            ) : (
              <div className="text-red-500">No requirements available for this document type.</div>
            )}
          </div>
          {req && (
            <div className={`mt-2 p-2 rounded text-xs ${
              isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'
            }`}>
              <span className="font-medium">💡 Tip:</span> {req.tips}
            </div>
          )}
        </div>
        
        {doc.file ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className={`w-5 h-5 ${
                isDark ? 'text-green-400' : 'text-green-600'
              }`} />
              <span className={`font-medium ${
                isDark ? 'text-green-400' : 'text-green-600'
              }`}>Uploaded Successfully</span>
            </div>
            
            {/* File Info Display */}
            {doc.fileInfo && (
              <div className={`p-2 rounded-lg text-xs ${
                isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700'
              }`}>
                <div className="flex justify-between items-center">
                  <span>📄 {doc.fileInfo.name}</span>
                  <span>{doc.fileInfo.sizeText}</span>
                </div>
              </div>
            )}
            
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => openImagePreview(doc.file, title)}
                className={`flex items-center px-3 py-1 text-sm rounded-lg transition-colors cursor-pointer ${
                  isDark 
                    ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/50' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview Image
              </button>
              <button
                onClick={() => document.getElementById(`file-${type}`).click()}
                className={`flex items-center px-3 py-1 text-sm rounded-lg transition-colors cursor-pointer ${
                  isDark 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Upload className="w-4 h-4 mr-1" />
                Replace
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Upload Progress Bar */}
            {(Number(uploadProgress[type] ?? 0) > 0 && Number(uploadProgress[type]) < 100) && (
              <div className="w-full">
                <div className={`flex justify-between text-sm mb-1 ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  <span>Uploading...</span>
                  <span>{uploadProgress[type]}%</span>
                </div>
                <div className={`w-full bg-gray-200 rounded-full h-2 ${
                  isDark ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress[type]}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            <button
              onClick={() => document.getElementById(`file-${type}`).click()}
              disabled={(Number(uploadProgress[type] ?? 0) > 0 && Number(uploadProgress[type]) < 100)}
              className={`flex items-center justify-center px-4 py-2 rounded-lg mx-auto transition-colors cursor-pointer ${
                uploadProgress[type] && uploadProgress[type] > 0 && uploadProgress[type] < 100
                  ? isDark ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isDark ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Upload className="w-4 h-4 mr-2" />
              {(Number(uploadProgress[type] ?? 0) > 0 && Number(uploadProgress[type]) < 100) 
                ? 'Uploading...' 
                : `Upload ${title}`
              }
            </button>
          </div>
        )}
        
        <input
          id={`file-${type}`}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload(type, e.target.files[0])}
          className="hidden"
        />
        
        {type === 'aadharCard' && (
          <div>
            <input
              type="text"
              placeholder="Aadhar Number (12 digits) *"
              value={formattedAadhar}
              onChange={(e) => {
                const inputValue = e.target.value;
                const raw = inputValue.replace(/\D/g, '');
                
                if (raw.length <= 12) {
                  const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
                  setFormattedAadhar(formatted);
                  setKycData(prev => ({
                    ...prev,
                    documents: {
                      ...prev.documents,
                      aadharCard: { 
                        ...(prev.documents?.aadharCard || {}), 
                        number: raw
                      }
                    }
                  }));
                  if (errors['documents.aadharCard.number']) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors['documents.aadharCard.number'];
                      return newErrors;
                    });
                  }
                }
              }}
              inputMode="numeric"
              maxLength={14}
              pattern="[0-9\s]*"
              autoComplete="off"
              className={`mt-3 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors['documents.aadharCard.number'] 
                  ? isDark ? 'border-red-400 bg-gray-800 text-white' : 'border-red-500'
                  : isDark ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' : 'border-gray-300'
              }`}
            />
            {errors['documents.aadharCard.number'] && (
              <p className={`text-sm mt-1 ${
                isDark ? 'text-red-400' : 'text-red-600'
              }`}>{errors['documents.aadharCard.number']}</p>
            )}
            {doc.number && doc.number.length < 12 && (
              <p className={`text-sm mt-1 ${
                isDark ? 'text-yellow-400' : 'text-yellow-600'
              }`}>
                Aadhar number must be exactly 12 digits ({doc.number.length}/12)
              </p>
            )}
          </div>
        )}
        
        {type === 'panCard' && (
          <div>
            <input
              type="text"
              placeholder="PAN Number (10 characters) *"
              value={doc.number || ''}
              onChange={(e) => {
                const inputValue = e.target.value.toUpperCase();
                const value = inputValue.replace(/[^A-Z0-9]/g, '');
                
                if (value.length <= 10) {
                  setKycData(prev => ({
                    ...prev,
                    documents: {
                      ...prev.documents,
                      panCard: { 
                        ...(prev.documents?.panCard || {}), 
                        number: value 
                      }
                    }
                  }));
                  if (errors['documents.panCard.number']) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors['documents.panCard.number'];
                      return newErrors;
                    });
                  }
                }
              }}
              maxLength={10}
              pattern="[A-Z0-9]*"
              autoComplete="off"
              style={{ textTransform: 'uppercase' }}
              className={`mt-3 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors['documents.panCard.number'] 
                  ? isDark ? 'border-red-400 bg-gray-800 text-white' : 'border-red-500'
                  : isDark ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' : 'border-gray-300'
              }`}
            />
            {errors['documents.panCard.number'] && (
              <p className={`text-sm mt-1 ${
                isDark ? 'text-red-400' : 'text-red-600'
              }`}>{errors['documents.panCard.number']}</p>
            )}
            {doc.number && doc.number.length < 10 && (
              <p className={`text-sm mt-1 ${
                isDark ? 'text-yellow-400' : 'text-yellow-600'
              }`}>
                PAN number must be exactly 10 characters ({doc.number.length}/10)
              </p>
            )}
            {doc.number && doc.number.length === 10 && (
              <p className={`text-sm mt-1 flex items-center ${
                isDark ? 'text-green-400' : 'text-green-600'
              }`}>
                <CheckCircle className="w-4 h-4 mr-1" />
                Valid PAN format
              </p>
            )}
          </div>
        )}
        
        {error && !doc.file && (
          <div className={`text-sm mt-2 space-y-2 ${
            isDark ? 'text-red-400' : 'text-red-600'
          }`}>
            <p>{error}</p>
            {error.includes('failed') && !error.includes('multiple attempts') && (
              <button
                onClick={() => retryUpload && retryUpload(type, kycData.documents[type]?.lastFile)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  isDark 
                    ? 'bg-red-900/50 text-red-300 hover:bg-red-800/50' 
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                Retry Upload
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const EnhancedKYCPage = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  
  // Error boundary state
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  
  // Helper function to load initial data from localStorage
  const loadInitialData = () => {
    try {
      const savedData = localStorage.getItem('kycFormData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        const lastSaved = new Date(parsed.lastSaved);
        const now = new Date();
        const hoursDiff = (now - lastSaved) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          console.log('🔄 Loading initial data from localStorage');
          return parsed;
        } else {
          console.log('⏰ Saved data expired, clearing');
          localStorage.removeItem('kycFormData');
        }
      }
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      localStorage.removeItem('kycFormData');
    }
    return null;
  };
  
  const initialSavedData = loadInitialData();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(initialSavedData?.currentStep || 1);
  const [kycData, setKycData] = useState({
    personalInfo: initialSavedData?.personalInfo || {
      fullName: '',
      dateOfBirth: '',
      phoneNumber: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      occupation: '',
      monthlyIncome: '',
    },
    documents: initialSavedData?.documents ? {
      aadharCard: {
        file: initialSavedData.documents.aadharCard?.cloudinaryUrl || null,
        number: initialSavedData.documents.aadharCard?.number || '',
        preview: initialSavedData.documents.aadharCard?.cloudinaryUrl || null,
        cloudinaryUrl: initialSavedData.documents.aadharCard?.cloudinaryUrl,
        publicId: initialSavedData.documents.aadharCard?.publicId,
        fileInfo: initialSavedData.documents.aadharCard?.fileInfo || null
      },
      panCard: {
        file: initialSavedData.documents.panCard?.cloudinaryUrl || null,
        number: initialSavedData.documents.panCard?.number || '',
        preview: initialSavedData.documents.panCard?.cloudinaryUrl || null,
        cloudinaryUrl: initialSavedData.documents.panCard?.cloudinaryUrl,
        publicId: initialSavedData.documents.panCard?.publicId,
        fileInfo: initialSavedData.documents.panCard?.fileInfo || null
      },
      bankStatement: {
        file: initialSavedData.documents.bankStatement?.cloudinaryUrl || null,
        preview: initialSavedData.documents.bankStatement?.cloudinaryUrl || null,
        cloudinaryUrl: initialSavedData.documents.bankStatement?.cloudinaryUrl,
        publicId: initialSavedData.documents.bankStatement?.publicId,
        fileInfo: initialSavedData.documents.bankStatement?.fileInfo || null
      },
      salarySlip: {
        file: initialSavedData.documents.salarySlip?.cloudinaryUrl || null,
        preview: initialSavedData.documents.salarySlip?.cloudinaryUrl || null,
        cloudinaryUrl: initialSavedData.documents.salarySlip?.cloudinaryUrl,
        publicId: initialSavedData.documents.salarySlip?.publicId,
        fileInfo: initialSavedData.documents.salarySlip?.fileInfo || null
      },
      selfie: {
        file: initialSavedData.documents.selfie?.cloudinaryUrl || null,
        preview: initialSavedData.documents.selfie?.cloudinaryUrl || null,
        cloudinaryUrl: initialSavedData.documents.selfie?.cloudinaryUrl,
        publicId: initialSavedData.documents.selfie?.publicId,
        fileInfo: initialSavedData.documents.selfie?.fileInfo || null
      }
    } : {
      aadharCard: { file: null, number: '', preview: null },
      panCard: { file: null, number: '', preview: null },
      bankStatement: { file: null, preview: null },
      salarySlip: { file: null, preview: null },
      selfie: { file: null, preview: null },
    },
    verification: initialSavedData?.verification || {
      otpVerification: false,
      biometricVerification: false,
      addressVerification: false,
    },
    addressVerificationData: {
      documentType: '',
      documentFile: null,
      status: 'pending' // 'pending', 'submitted', 'verified', 'rejected'
    }
  });
  
  // Missing state declarations - ADD these:
  const [errors, setErrors] = useState({});
  const [authorized, setAuthorized] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [formattedAadhar, setFormattedAadhar] = useState(initialSavedData?.formattedAadhar || '');
  const [previewModal, setPreviewModal] = useState({
    open: false,
    image: null,
    title: '',
    fileType: null
  });
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showRestoredNotification, setShowRestoredNotification] = useState(false);
  const [showOtpSentNotification, setShowOtpSentNotification] = useState(false);
  const [showPhoneVerifiedNotification, setShowPhoneVerifiedNotification] = useState(false);
  const [dataRestored, setDataRestored] = useState(!!initialSavedData);
  
  // General toast notification state
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success' // 'success', 'error', 'warning', 'info'
  });

  // Helper function to show toast
  const showToast = (message, type = 'info', duration = 5000) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'info' });
    }, duration);
  };

  // Missing steps definition - ADD this:
  const steps = [
    { id: 1, title: "Personal Info", icon: User },
    { id: 2, title: "Documents", icon: FileText },
    { id: 3, title: "Verification", icon: Shield },
    { id: 4, title: "Review", icon: CheckCircle }
  ];

  
  // Enhanced loading and error states

  const [retryCount, setRetryCount] = useState({});
  const [uploading, setUploading] = useState(false);
  
  // reCAPTCHA container ref for better DOM management
  const recaptchaContainerRef = useRef(null);

  

  // Image compression utility
  const compressImage = (file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          file.type,
          quality
        );
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // ADD these missing functions:
  const calculateAge = (dateOfBirth) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    
    if (isNaN(birthDate.getTime()) || birthDate > today) return null;
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const openImagePreview = (imageFile, title) => {
    // Check if imageFile is a File object or URL string
    let imageUrl;
    if (imageFile instanceof File) {
      imageUrl = URL.createObjectURL(imageFile);
    } else {
      imageUrl = imageFile; // Assume it's already a URL string
    }
    
    setPreviewModal({
      open: true,
      image: imageUrl,
      title: title,
      fileType: imageFile instanceof File ? imageFile.type : 'image'
    });
  };

  // Enhanced retry logic

  // Security: Sanitize input to prevent XSS
  const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .trim();
  };

  // Enhanced validation with security checks
  const validateSecureInput = (value, type) => {
    const sanitized = sanitizeInput(value);
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(sanitized)) {
        return { isValid: false, error: 'Invalid characters detected' };
      }
    }
    
    return { isValid: true, value: sanitized };
  };

  // Critical File Upload Handler - FIXED to actually upload files
  const handleFileUpload = async (documentType, file) => {
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        [`documents.${documentType}`]: 'File size must be less than 5MB'
      }));
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        [`documents.${documentType}`]: 'Only JPEG, PNG, and PDF files are allowed'
      }));
      return;
    }

    try {
      setUploadProgress(prev => ({ ...prev, [documentType]: 0 }));

      // Create preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);

      // Compress image if needed
      let processedFile = file;
      if (file.type.startsWith('image/')) {
        processedFile = await compressImage(file);
      }

      // Validate dimensions
      if (file.type.startsWith('image/')) {
        const isValidDimension = await validateImageDimensions(processedFile, documentType);
        if (!isValidDimension) return;
      }

      // Start upload progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[documentType] || 0;
          if (current >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [documentType]: Math.min(current + 10, 90) };
        });
      }, 100);

      // Actually upload to backend/Cloudinary
      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('documentType', documentType);

      const response = await API.post('/upload/kyc-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);

      if (response.data.success) {
        // Update document state with Cloudinary URL
        setKycData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [documentType]: {
              file: response.data.url, // Store Cloudinary URL instead of File object
              preview: previewUrl,
              fileInfo: {
                name: file.name,
                size: file.size,
                sizeText: formatFileSize(file.size)
              },
              lastFile: file,
              cloudinaryUrl: response.data.url,
              publicId: response.data.public_id
            }
          }
        }));

        // Clear any existing errors
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`documents.${documentType}`];
          return newErrors;
        });

        // Complete progress
        setUploadProgress(prev => ({ ...prev, [documentType]: 100 }));

        console.log(`✅ ${documentType} uploaded successfully:`, response.data.url);
      } else {
        throw new Error('Upload failed');
      }

    } catch (error) {
      console.error('File upload error:', error);
      setErrors(prev => ({
        ...prev,
        [`documents.${documentType}`]: 'Upload failed. Please try again.'
      }));
      setUploadProgress(prev => ({ ...prev, [documentType]: 0 }));
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const retryUpload = (documentType, file) => {
    if (file && retryCount[documentType] < 3) {
      setRetryCount(prev => ({
        ...prev,
        [documentType]: (prev[documentType] || 0) + 1
      }));
      handleFileUpload(documentType, file);
    }
  };

  // Missing validation functions
  const validateStep = (step) => {
    // Basic step validation - can be enhanced
    switch (step) {
      case 1:
        return kycData.personalInfo.fullName && 
               kycData.personalInfo.dateOfBirth && 
               kycData.personalInfo.phoneNumber;
      case 2:
        return kycData.documents.aadharCard.file && 
               kycData.documents.panCard.file && 
               kycData.documents.selfie.file;
      case 3:
        return phoneVerification.step === 'verified';
      default:
        return true;
    }
  };

  const validateImageDimensions = async (file, documentType) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(true);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const minDimensions = {
          aadharCard: { width: 800, height: 500 },
          panCard: { width: 800, height: 500 },
          selfie: { width: 400, height: 400 },
          bankStatement: { width: 600, height: 800 }
        };

        const required = minDimensions[documentType];
        if (required && (img.width < required.width || img.height < required.height)) {
          setErrors(prev => ({
            ...prev,
            [`documents.${documentType}`]: `Image must be at least ${required.width}x${required.height}px`
          }));
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
  };
  
  
  // Phone verification states
  const [phoneVerification, setPhoneVerification] = useState({
    step: localStorage.getItem('phoneVerified') === 'true' ? 'verified' : 'phone', // Check if already verified
    phoneNumber: '',
    otp: '',
    confirmationResult: null,
    loading: false,
    error: null
  });

  // Address verification states
  const [addressVerification, setAddressVerification] = useState({
    step: 'pending', // 'pending', 'document_upload', 'submitted', 'verified'
    selectedDocument: '', // 'utility_bill', 'aadhar', 'bank_statement'
    uploadedDocument: null,
    loading: false,
    error: null
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await handleAPICall(async () => {
            const res = await API.get("/users/me");
            if (res.data.role === "borrower") {
              setAuthorized(true);
              setUser(res.data);
              // Only pre-fill basic info if NO data was restored from localStorage
              if (res.data.name && !dataRestored) {
                setKycData(prev => ({
                  ...prev,
                  personalInfo: {
                    ...prev.personalInfo,
                    fullName: res.data.name,
                  }
                }));
              }
            }
          }, "Failed to verify user credentials");
        } catch (error) {
          console.error("Error verifying user:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [dataRestored]); // Add dataRestored as dependency

  // Sync phone number from personal info to verification state
  useEffect(() => {
    if (kycData.personalInfo.phoneNumber && !phoneVerification.phoneNumber) {
      setPhoneVerification(prev => ({
        ...prev,
        phoneNumber: kycData.personalInfo.phoneNumber
      }));
    }
  }, [kycData.personalInfo.phoneNumber]);

  // Initialize phone verification status from localStorage
  useEffect(() => {
    if (localStorage.getItem('phoneVerified') === 'true') {
      setKycData(prev => ({
        ...prev,
        verification: {
          ...prev.verification,
          otpVerification: true
        }
      }));
    }
  }, []);

  // Cleanup reCAPTCHA verifier on component unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        } catch (error) {
          console.log('Error cleaning up reCAPTCHA:', error);
        }
      }
      
      // Clear the reCAPTCHA container DOM element
      const container = document.getElementById('recaptcha-container');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  // Auto-save form data to localStorage (Enhanced to save all progress)
  useEffect(() => {
    const saveData = {
      personalInfo: kycData.personalInfo,
      documents: {
        aadharCard: { 
          number: kycData.documents.aadharCard.number,
          hasFile: !!kycData.documents.aadharCard.file,
          cloudinaryUrl: kycData.documents.aadharCard.cloudinaryUrl,
          publicId: kycData.documents.aadharCard.publicId,
          fileInfo: kycData.documents.aadharCard.fileInfo
        },
        panCard: { 
          number: kycData.documents.panCard.number,
          hasFile: !!kycData.documents.panCard.file,
          cloudinaryUrl: kycData.documents.panCard.cloudinaryUrl,
          publicId: kycData.documents.panCard.publicId,
          fileInfo: kycData.documents.panCard.fileInfo
        },
        bankStatement: { 
          hasFile: !!kycData.documents.bankStatement.file,
          cloudinaryUrl: kycData.documents.bankStatement.cloudinaryUrl,
          publicId: kycData.documents.bankStatement.publicId,
          fileInfo: kycData.documents.bankStatement.fileInfo
        },
        salarySlip: { 
          hasFile: !!kycData.documents.salarySlip.file,
          cloudinaryUrl: kycData.documents.salarySlip.cloudinaryUrl,
          publicId: kycData.documents.salarySlip.publicId,
          fileInfo: kycData.documents.salarySlip.fileInfo
        },
        selfie: { 
          hasFile: !!kycData.documents.selfie.file,
          cloudinaryUrl: kycData.documents.selfie.cloudinaryUrl,
          publicId: kycData.documents.selfie.publicId,
          fileInfo: kycData.documents.selfie.fileInfo
        }
      },
      verification: kycData.verification,
      currentStep,
      formattedAadhar,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem('kycFormData', JSON.stringify(saveData));
  }, [kycData, currentStep, formattedAadhar]);

  // Load saved form data on component mount (Enhanced to restore all progress)
  useEffect(() => {
    // Show notification if data was restored
    if (initialSavedData) {
      console.log('✅ KYC form progress restored from', new Date(initialSavedData.lastSaved).toLocaleString());
      console.log('📊 Restored data:', {
        step: initialSavedData.currentStep,
        hasPersonalInfo: !!initialSavedData.personalInfo,
        personalInfoKeys: initialSavedData.personalInfo ? Object.keys(initialSavedData.personalInfo) : [],
        personalInfoValues: initialSavedData.personalInfo
      });
      setShowRestoredNotification(true);
      
      // Hide notification after 5 seconds
      setTimeout(() => {
        setShowRestoredNotification(false);
      }, 5000);
    }
  }, []); // Run once on mount

  // Cleanup object URLs on component unmount
  useEffect(() => {
    return () => {
      // Clean up any active preview URLs
      if (previewModal.image && previewModal.image.startsWith('blob:')) {
        URL.revokeObjectURL(previewModal.image);
      }
    };
  }, [previewModal.image]);

  // Comprehensive cleanup for document URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup preview URLs to prevent memory leaks
      Object.values(kycData.documents).forEach(doc => {
        if (doc.preview && doc.preview.startsWith('blob:')) {
          URL.revokeObjectURL(doc.preview);
        }
      });
    };
  }, []);

  // Firebase configuration validation
  useEffect(() => {
    if (!auth) {
      console.error('Firebase auth not initialized');
      showToast('Authentication service unavailable. Please refresh the page.', 'error');
      return;
    }
  }, []);


  // Validation helper functions
  const validatePhoneNumber = (phone) => {
    // Remove all non-numeric characters and handle +91
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Handle +91 prefix (12 total digits including country code)
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      const actualNumber = cleanPhone.slice(2);
      return actualNumber.length === 10 && /^[6-9]/.test(actualNumber);
    }
    
    // Standard 10-digit Indian mobile number (should start with 6, 7, 8, or 9)
    return cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone);
  };

  const validateAge = (dateOfBirth) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    
    // Check if date is valid
    if (isNaN(birthDate.getTime())) return false;
    
    // Check if date is not in future
    if (birthDate > today) return false;
    
    // Calculate age precisely
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age >= 18 && age <= 100; // Reasonable age limits
  };

  const validateAlphabetsOnly = (text) => {
    if (!text || text.trim().length < 2) return false;
    // Allow alphabets and spaces only, minimum 2 characters
    return /^[a-zA-Z\s]{2,}$/.test(text.trim());
  };

  const validatePincode = (pincode) => {
    // Indian pincode: 6 digits, cannot start with 0
    const cleanPincode = pincode.replace(/\D/g, '');
    return cleanPincode.length === 6 && !cleanPincode.startsWith('0') && /^[1-9]\d{5}$/.test(cleanPincode);
  };

  const validateIncome = (income) => {
    const numericIncome = parseFloat(income.toString().replace(/[₹,\s]/g, ''));
    return !isNaN(numericIncome) && numericIncome >= 1 && numericIncome <= 10000000; // 1 rupee to 1 crore
  };

  const validateName = (name) => {
    if (!name || name.trim().length < 2) return false;
    // Allow alphabets, spaces, dots, and hyphens for names
    return /^[a-zA-Z\s.-]{2,}$/.test(name.trim());
  };

  // Add error handling wrapper for API calls
  const handleAPICall = async (apiCall, errorMessage = 'Operation failed') => {
    try {
      return await apiCall();
    } catch (error) {
      console.error('API Error:', error);
      
      if (error.response?.status === 401) {
        // Unauthorized - redirect to login
        navigate('/login');
        return;
      }
      
      if (error.response?.status === 403) {
        setAuthorized(false);
        return;
      }
      
      if (error.response?.status >= 500) {
        showToast('Server error. Please try again later.', 'error');
        return;
      }
      
      showToast(error.response?.data?.error || errorMessage, 'error');
      throw error;
    }
  };

  // Global error handler
  const handleComponentError = (error, errorInfo) => {
    console.error('Component Error:', error, errorInfo);
    setHasError(true);
    setErrorInfo(error.message || 'An unexpected error occurred');
  };

  // Wrap potentially error-prone operations
  const safeExecute = (fn, fallback = null) => {
    try {
      return fn();
    } catch (error) {
      handleComponentError(error, { componentStack: error.stack });
      return fallback;
    }
  };


  const handleInputChange = (section, field, value) => {
    // Security validation
    const securityCheck = validateSecureInput(value, field);
    if (!securityCheck.isValid) {
      setErrors(prev => ({
        ...prev,
        [`${section}.${field}`]: securityCheck.error
      }));
      return;
    }

    let processedValue = securityCheck.value;
    let error = null;

    // Field-specific validation and processing
    if (section === 'personalInfo') {
      // Log user interaction for analytics (non-PII)
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'form_field_interaction', {
          field_name: field,
          section: section
        });
      }

      switch (field) {
        case 'fullName':
          // Allow only alphabets, spaces, dots, hyphens, and apostrophes
          processedValue = value.replace(/[^a-zA-Z\s.'-]/g, '');
          if (processedValue && !validateName(processedValue)) {
            error = 'Name should contain only alphabets and be at least 2 characters long';
          }
          if (processedValue.length > 50) {
            processedValue = processedValue.substring(0, 50);
            error = 'Name cannot exceed 50 characters';
          }
          break;

        case 'phoneNumber':
          // Allow only numeric characters and + at the beginning
          processedValue = value.replace(/[^\d+]/g, '');
          
          // Ensure + is only at the beginning
          if (processedValue.includes('+')) {
            const parts = processedValue.split('+');
            processedValue = '+' + parts.join('').replace(/\D/g, '');
          }
          
          // Limit length
          if (processedValue.startsWith('+91')) {
            processedValue = processedValue.substring(0, 15); // +91 + 10 digits
          } else if (processedValue.startsWith('+')) {
            processedValue = processedValue.substring(0, 15);
          } else {
            processedValue = processedValue.substring(0, 10);
          }
          
          if (processedValue && !validatePhoneNumber(processedValue)) {
            error = 'Please enter a valid 10-digit mobile number or include country code (+91)';
          }
          break;

        case 'dateOfBirth':
          if (processedValue) {
            const selectedDate = new Date(processedValue);
            const today = new Date();
            
            if (selectedDate > today) {
              error = 'Date of birth cannot be in the future';
            } else if (!validateAge(processedValue)) {
              error = 'You must be at least 18 years old';
            }
          }
          break;

        case 'city':
        case 'state':
          // Allow only alphabets and spaces
          processedValue = value.replace(/[^a-zA-Z\s]/g, '');
          if (processedValue.length > 30) {
            processedValue = processedValue.substring(0, 30);
          }
          if (processedValue && !validateAlphabetsOnly(processedValue)) {
            error = `${field === 'city' ? 'City' : 'State'} should contain only alphabets and be at least 2 characters long`;
          }
          break;

        case 'pincode':
          // Allow only numeric characters
          processedValue = value.replace(/\D/g, '');
          if (processedValue.length > 6) {
            processedValue = processedValue.substring(0, 6);
          }
          if (processedValue && !validatePincode(processedValue)) {
            error = 'Please enter a valid 6-digit pincode (cannot start with 0)';
          }
          break;

        case 'address':
          // Allow all characters except < and > for security, but do not remove spaces
          processedValue = value.replace(/[<>]/g, '');
          if (processedValue.length > 200) {
            processedValue = processedValue.substring(0, 200);
            error = 'Address cannot exceed 200 characters';
          }
          if (processedValue && processedValue.trim().length < 10) {
            error = 'Please provide a complete address (minimum 10 characters)';
          }
          break;

        case 'occupation':
          // Allow alphabets, spaces, and common occupation characters
          processedValue = value.replace(/[^a-zA-Z\s.-]/g, '');
          if (processedValue.length > 50) {
            processedValue = processedValue.substring(0, 50);
          }
          if (processedValue && processedValue.trim().length < 2) {
            error = 'Occupation should be at least 2 characters long';
          }
          break;

        case 'monthlyIncome':
          // Allow only numeric characters
          processedValue = value.replace(/\D/g, '');
          if (processedValue && !validateIncome(processedValue)) {
            error = 'Please enter a valid monthly income (₹1 - ₹1,00,00,000)';
          }
          break;

        default:
          break;
      }
    }

    // Update the state with processed value
    setKycData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: processedValue
      }
    }));
    
    // Set or clear error
    setErrors(prev => ({
      ...prev,
      [`${section}.${field}`]: error
    }));
  };





  const submitKYC = async () => {
    try {
      setUploading(true);
      
      // Ensure all document fields are strings (URLs), not objects
      const ensureString = (value) => {
        if (typeof value === 'object' || value === null || value === undefined) {
          return '';
        }
        return String(value);
      };

      // Check if all required documents are uploaded (have Cloudinary URLs)
      const hasValidDocuments = () => {
        const aadharUrl = kycData.documents.aadharCard?.file || '';
        const panUrl = kycData.documents.panCard?.file || '';
        const selfieUrl = kycData.documents.selfie?.file || '';
        
        return aadharUrl && panUrl && selfieUrl;
      };

      if (!hasValidDocuments()) {
        showToast('Please upload all required documents before submitting.', 'warning');
        setUploading(false);
        return;
      }
      
      // Structure the data according to the backend KYC model
      const submissionData = {
        userName: user.name,
        userEmail: user.email,
        userPhone: kycData.personalInfo.phoneNumber,
        personalInfo: {
          fullName: kycData.personalInfo.fullName,
          dateOfBirth: kycData.personalInfo.dateOfBirth,
          address: `${kycData.personalInfo.address}, ${kycData.personalInfo.city}, ${kycData.personalInfo.state} - ${kycData.personalInfo.pincode}`,
          phoneNumber: kycData.personalInfo.phoneNumber,
          occupation: kycData.personalInfo.occupation || 'Not specified',
          monthlyIncome: parseInt(kycData.personalInfo.monthlyIncome) || 0,
        },
        documents: {
          aadhar: {
            number: ensureString(kycData.documents.aadharCard?.number),
            frontImage: ensureString(kycData.documents.aadharCard?.file),
            backImage: ensureString(kycData.documents.aadharCard?.file), // Using same image for both sides for now
          },
          pan: {
            number: ensureString(kycData.documents.panCard?.number),
            image: ensureString(kycData.documents.panCard?.file),
          },
          selfie: ensureString(kycData.documents.selfie?.file),
          addressProof: {
            docType: 'bank_statement',
            image: ensureString(kycData.documents.bankStatement?.file)
          },
          incomeProof: {
            docType: 'salary_slip', 
            image: ensureString(kycData.documents.salarySlip?.file)
          }
        },
        verificationStatus: {
          phoneVerification: {
            status: phoneVerification.step === 'verified' ? 'verified' : 'pending',
            verifiedAt: phoneVerification.step === 'verified' ? new Date() : null,
            phoneNumber: kycData.personalInfo.phoneNumber
          }
        }
      };

      console.log('📤 Submitting KYC data:', JSON.stringify(submissionData, null, 2));
      console.log('🔍 Documents structure:', {
        aadhar: kycData.documents.aadharCard,
        pan: kycData.documents.panCard,
        selfie: kycData.documents.selfie,
        bankStatement: kycData.documents.bankStatement,
        salarySlip: kycData.documents.salarySlip
      });

      // Validate required fields on frontend
      if (!submissionData.documents.aadhar.frontImage || !submissionData.documents.pan.image || !submissionData.documents.selfie) {
        showToast('Please upload all required documents (Aadhar Card, PAN Card, and Selfie)', 'warning');
        setUploading(false);
        return;
      }
      
      if (!submissionData.documents.aadhar.number) {
        showToast('Please enter your Aadhar card number', 'warning');
        setUploading(false);
        return;
      }
      
      if (!submissionData.documents.pan.number) {
        showToast('Please enter your PAN card number', 'warning');
        setUploading(false);
        return;
      }
      
      const response = await handleAPICall(
        async () => await API.post('/kyc/submit', submissionData),
        'Failed to submit KYC documents. Please try again.'
      );
      
      if (response && response.data.kyc) {
        // Update user with KYC data including attempt tracking
        setUser(prev => ({
          ...prev,
          kyc: {
            status: response.data.kyc.status,
            submittedAt: response.data.kyc.submittedAt,
            submissionAttempts: response.data.attempts || response.data.kyc.submissionAttempts,
            maxAttemptsReached: response.data.maxAttemptsReached || response.data.kyc.maxAttemptsReached
          }
        }));
      }
      
      // Show success message with attempt information
      const attemptMsg = response.data.attempts ? ` (Attempt ${response.data.attempts}/3)` : '';
      showToast(`KYC submitted successfully${attemptMsg}! Your documents will be reviewed within 24-48 hours.`, 'success', 7000);
      
      // Clear saved form data from localStorage after successful submission
      localStorage.removeItem('kycFormData');
      
      // Clear phone verification status after successful submission
      localStorage.removeItem('phoneVerified');
      
    } catch (error) {
      console.error('KYC submission error:', error);
      
      // Handle maximum attempts reached error
      if (error.response?.data?.maxAttemptsReached) {
        setUser(prev => ({
          ...prev,
          kyc: {
            status: 'rejected',
            maxAttemptsReached: true,
            submissionAttempts: error.response.data.attempts || 3
          }
        }));
        showToast('Maximum KYC submission attempts reached. Please contact support for assistance.', 'error', 7000);
      } else {
        showToast(`Failed to submit KYC: ${error.response?.data?.error || 'Please try again.'}`, 'error');
      }
    } finally {
      setUploading(false);
    }
  };

  // Phone verification functions
  const resetPhoneVerification = () => {
    // Use comprehensive reCAPTCHA cleanup
    clearAllRecaptcha();
    
    // Reset phone verification state
    setPhoneVerification(prev => ({
      ...prev,
      step: 'phone',
      otp: '',
      confirmationResult: null,
      error: null,
      loading: false
    }));
  };

  // Nuclear option: completely destroy and recreate everything
  const nuclearRecaptchaReset = () => {
    console.log('💣 NUCLEAR RESET: Destroying all reCAPTCHA elements...');
    
    try {
      // 1. Clear any existing verifier
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.log('⚠️ Error clearing verifier:', e);
        }
        delete window.recaptchaVerifier;
      }

      // 2. Remove ALL reCAPTCHA related elements from DOM
      const allRecaptchaElements = document.querySelectorAll('[id*="recaptcha"], .grecaptcha-badge, iframe[src*="recaptcha"]');
      allRecaptchaElements.forEach(element => {
        console.log('🗑️ Removing element:', element.id || element.className);
        element.remove();
      });

      // 3. Clear all reCAPTCHA related global variables
      if (window.grecaptcha) {
        try {
          window.grecaptcha.reset();
        } catch (e) {
          console.log('⚠️ Error resetting grecaptcha:', e);
        }
      }

      // 4. Remove the container from React ref
      if (recaptchaContainerRef.current) {
        recaptchaContainerRef.current.remove();
        recaptchaContainerRef.current = null;
      }

      // 5. Force garbage collection hint
      if (window.gc) {
        window.gc();
      }

      console.log('💥 Nuclear reset completed');
      return true;
    } catch (error) {
      console.error('❌ Nuclear reset failed:', error);
      return false;
    }
  };

  // Utility function to completely clear reCAPTCHA
  const clearAllRecaptcha = () => {
    console.log('🧹 Starting comprehensive reCAPTCHA cleanup...');
    
    try {
      // Clear the verifier instance
      if (window.recaptchaVerifier) {
        console.log('🗑️ Clearing reCAPTCHA verifier instance');
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.log('⚠️ Error clearing verifier:', e);
        }
        window.recaptchaVerifier = null;
      }

      // Clear the main container
      const containers = document.querySelectorAll('[id*="recaptcha-container"]');
      console.log(`🗑️ Found ${containers.length} reCAPTCHA containers to clear`);
      
      containers.forEach((container, index) => {
        console.log(`🗑️ Clearing container ${index + 1}:`, container.id);
        container.innerHTML = '';
        // Reset to original ID for consistency
        if (container.id.includes('recaptcha-container')) {
          container.id = 'recaptcha-container';
        }
      });

      // Clear any other reCAPTCHA elements that might exist
      const recaptchaElements = document.querySelectorAll('[id^="rc-"], .grecaptcha-badge, iframe[src*="recaptcha"], iframe[src*="google.com/recaptcha"]');
      console.log(`🗑️ Found ${recaptchaElements.length} reCAPTCHA elements to remove`);
      
      recaptchaElements.forEach((element, index) => {
        try {
          console.log(`🗑️ Removing reCAPTCHA element ${index + 1}:`, element.tagName, element.id || element.className);
          element.remove();
        } catch (e) {
          console.log('⚠️ Could not remove reCAPTCHA element:', e);
        }
      });

      // Also clear any reCAPTCHA scripts or global variables
      if (window.grecaptcha) {
        console.log('🗑️ Resetting grecaptcha global');
        try {
          if (window.grecaptcha.reset) {
            window.grecaptcha.reset();
          }
        } catch (e) {
          console.log('⚠️ Error resetting grecaptcha:', e);
        }
      }

      console.log('✅ reCAPTCHA cleanup completed');
    } catch (error) {
      console.error('❌ Error during reCAPTCHA cleanup:', error);
    }
  };

  const setupRecaptcha = async (retryCount = 0) => {
    console.log(`🔧 Setting up reCAPTCHA (attempt ${retryCount + 1})...`);
    
    try {
      // For retries, use nuclear reset
      if (retryCount > 0) {
        console.log('🚨 Using nuclear reset for retry...');
        const resetSuccess = nuclearRecaptchaReset();
        if (!resetSuccess && retryCount < 3) {
          console.log('💥 Nuclear reset failed, trying again...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return setupRecaptcha(retryCount + 1);
        }
        // Wait longer after nuclear reset
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        // First attempt, use regular cleanup
        clearAllRecaptcha();
      }

      // Create a completely new container
      const containerId = `recaptcha-container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Remove any existing container first
      const existingContainer = document.getElementById('recaptcha-container');
      if (existingContainer) {
        existingContainer.remove();
      }
      
      // Create new container
      const container = document.createElement('div');
      container.id = containerId;
      container.style.cssText = 'position: absolute; bottom: 0; left: 0; opacity: 0; pointer-events: none; height: 1px; overflow: hidden; z-index: -9999;';
      document.body.appendChild(container);
      
      // Update ref to point to new container
      recaptchaContainerRef.current = container;
      
      console.log(`✅ New reCAPTCHA container created with ID: ${containerId}`);

      // Wait for DOM to settle
      await new Promise(resolve => setTimeout(resolve, 800));

      // Verify container still exists
      const finalContainer = document.getElementById(containerId);
      if (!finalContainer) {
        throw new Error(`Container ${containerId} disappeared after creation`);
      }

      console.log('🏗️ Creating new reCAPTCHA verifier...');
      
      // Create new reCAPTCHA verifier with the new container
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: (response) => {
          console.log('✅ reCAPTCHA solved:', response);
        },
        'expired-callback': () => {
          console.log('⏰ reCAPTCHA expired');
          setPhoneVerification(prev => ({
            ...prev,
            error: 'reCAPTCHA expired. Click "Start Fresh" and try again.'
          }));
        }
      });

      console.log('✅ reCAPTCHA verifier created successfully');
      return window.recaptchaVerifier;
    } catch (error) {
      console.error(`❌ Error setting up reCAPTCHA (attempt ${retryCount + 1}):`, error);
      
      // If we get the "already rendered" error and haven't tried too many times, retry
      if (error.message.includes('already been rendered') && retryCount < 3) {
        console.log(`🔄 Retrying setup due to "already rendered" error...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return setupRecaptcha(retryCount + 1);
      }
      
      setPhoneVerification(prev => ({
        ...prev,
        error: 'Failed to setup verification. Please refresh the page and try again.'
      }));
      return null;
    }
  };

  const sendOTP = async () => {
    if (!phoneVerification.phoneNumber) {
      setPhoneVerification(prev => ({
        ...prev,
        error: 'Please enter a valid phone number'
      }));
      return;
    }

    // Format phone number to international format
    let formattedPhone = phoneVerification.phoneNumber;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone; // Assuming India
    }

    setPhoneVerification(prev => ({
      ...prev,
      loading: true,
      error: null
    }));

    try {
      const appVerifier = await setupRecaptcha();
      if (!appVerifier) {
        setPhoneVerification(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to initialize verification. Please refresh the page.'
        }));
        return;
      }

      // Get current user and create phone auth provider
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      console.log('📱 Sending OTP to:', formattedPhone);
      console.log('👤 Current user:', currentUser.email);

      const provider = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(formattedPhone, appVerifier);
      
      console.log('✅ OTP sent successfully, verification ID:', verificationId);
      
      setPhoneVerification(prev => ({
        ...prev,
        confirmationResult: { verificationId }, // Store verificationId for linking
        step: 'otp',
        loading: false
      }));

      console.log('📝 Verification data stored:', { verificationId });

      // Show toast notification
      setShowOtpSentNotification(true);
      setTimeout(() => {
        setShowOtpSentNotification(false);
      }, 5000);
    } catch (error) {
      console.error('OTP error:', error);
      let errorMessage = 'Failed to send OTP. ';
      
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format. Please enter a valid 10-digit mobile number.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
      } else if (error.message && error.message.includes('reCAPTCHA')) {
        errorMessage = 'Verification failed. Click "Resend OTP" to try again with a new verification.';
        // Clear the verifier so it can be recreated
        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
          } catch (e) {
            console.log('Error clearing reCAPTCHA verifier');
          }
        }
      } else if (error.code === 'auth/captcha-check-failed') {
        errorMessage = 'Verification check failed. Please try again.';
      } else {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setPhoneVerification(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  };

  const verifyOTP = async () => {
    if (!phoneVerification.otp || phoneVerification.otp.length !== 6) {
      setPhoneVerification(prev => ({
        ...prev,
        error: 'Please enter a valid 6-digit OTP'
      }));
      return;
    }

    setPhoneVerification(prev => ({
      ...prev,
      loading: true,
      error: null
    }));

    try {
      console.log('🔐 Starting OTP verification...');
      console.log('Verification data:', phoneVerification.confirmationResult);
      
      // Get the verification ID from our stored data
      const verificationId = phoneVerification.confirmationResult?.verificationId;
      
      if (!verificationId) {
        console.error('❌ No verification ID found');
        throw new Error('No verification session found. Please request OTP again.');
      }

      console.log('✅ Verification ID found:', verificationId);
      console.log('🔢 OTP entered:', phoneVerification.otp);

      // Create phone credential using the verification ID and OTP
      const credential = PhoneAuthProvider.credential(verificationId, phoneVerification.otp);
      console.log('🎫 Phone credential created');

      // Get current user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('❌ No current user found');
        throw new Error('User not authenticated. Please sign in again.');
      }

      console.log('👤 Current user found:', currentUser.email);

      // Check if phone number is already linked to this user
      const phoneProviders = currentUser.providerData.filter(provider => provider.providerId === 'phone');
      if (phoneProviders.length > 0) {
        console.log('📱 Phone already linked to this user:', phoneProviders[0].phoneNumber);
        
        // Mark as verified since it's already linked
        setPhoneVerification(prev => ({
          ...prev,
          step: 'verified',
          loading: false,
          error: null
        }));

        setKycData(prev => ({
          ...prev,
          verification: {
            ...prev.verification,
            otpVerification: true
          }
        }));

        localStorage.setItem('phoneVerified', 'true');
        console.log('✅ Phone verification completed (already linked)');
        
        // Show toast notification
        setShowPhoneVerifiedNotification(true);
        setTimeout(() => {
          setShowPhoneVerifiedNotification(false);
        }, 5000);
        return;
      }

      // Try to link the phone credential to the current user
      console.log('🔗 Attempting to link phone credential to user...');
      
      try {
        const result = await linkWithCredential(currentUser, credential);
        console.log('✅ Phone credential linked successfully:', result);
      } catch (linkError) {
        console.error('❌ Link error:', linkError);
        
        if (linkError.code === 'auth/account-exists-with-different-credential') {
          // Phone number exists with different account, but we can still verify for this session
          console.log('⚠️ Phone exists with different account, marking as verified for current session');
          
          setPhoneVerification(prev => ({
            ...prev,
            step: 'verified',
            loading: false,
            error: null
          }));

          setKycData(prev => ({
            ...prev,
            verification: {
              ...prev.verification,
              otpVerification: true
            }
          }));

          localStorage.setItem('phoneVerified', 'true');
          console.log('✅ Phone verification completed (session verified)');
          
          // Show toast notification
          setShowPhoneVerifiedNotification(true);
          setTimeout(() => {
            setShowPhoneVerifiedNotification(false);
          }, 5000);
          return;
        } else {
          // Re-throw other errors
          throw linkError;
        }
      }

      // Mark as verified
      setPhoneVerification(prev => ({
        ...prev,
        step: 'verified',
        loading: false,
        error: null
      }));

      // Update KYC data
      setKycData(prev => ({
        ...prev,
        verification: {
          ...prev.verification,
          otpVerification: true
        }
      }));

      // Store verification status
      localStorage.setItem('phoneVerified', 'true');
      console.log('✅ Phone verification completed successfully');

      // Show toast notification
      setShowPhoneVerifiedNotification(true);
      setTimeout(() => {
        setShowPhoneVerifiedNotification(false);
      }, 5000);

    } catch (error) {
      console.error('❌ OTP verification error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Invalid OTP. Please check and try again.';
      
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid OTP code. Please check the 6-digit code and try again.';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'OTP has expired. Please click "Resend OTP" to get a new code.';
      } else if (error.code === 'auth/invalid-verification-id') {
        errorMessage = 'Verification session is invalid. Please request a new OTP.';
      } else if (error.code === 'auth/missing-verification-code') {
        errorMessage = 'Please enter the OTP code.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        // Handle the case where phone exists with different account
        console.log('📱 Phone exists with different account, but OTP was valid');
        errorMessage = 'Phone number verified successfully! (Note: This number is associated with another account, but verification is complete for this session.)';
        
        // Mark as verified since OTP was correct
        setPhoneVerification(prev => ({
          ...prev,
          step: 'verified',
          loading: false,
          error: null
        }));
        setKycData(prev => ({
          ...prev,
          verification: {
            ...prev.verification,
            otpVerification: true
          }
        }));
        localStorage.setItem('phoneVerified', 'true');
        
        // Show toast notification
        setShowPhoneVerifiedNotification(true);
        setTimeout(() => {
          setShowPhoneVerifiedNotification(false);
        }, 5000);
        return;
      } else if (error.code === 'auth/credential-already-in-use') {
        errorMessage = 'This phone number is already linked to another account.';
      } else if (error.code === 'auth/provider-already-linked') {
        errorMessage = 'Phone number already verified for this account.';
        // Consider this a success case
        setPhoneVerification(prev => ({
          ...prev,
          step: 'verified',
          loading: false,
          error: null
        }));
        setKycData(prev => ({
          ...prev,
          verification: {
            ...prev.verification,
            otpVerification: true
          }
        }));
        localStorage.setItem('phoneVerified', 'true');
        
        // Show toast notification
        setShowPhoneVerifiedNotification(true);
        setTimeout(() => {
          setShowPhoneVerifiedNotification(false);
        }, 5000);
        return;
      } else if (error.message && error.message.includes('verification session')) {
        errorMessage = 'Verification session expired. Please request OTP again.';
      } else if (error.message && error.message.includes('User not authenticated')) {
        errorMessage = 'Please sign in again and try verification.';
      } else {
        errorMessage = `Verification failed: ${error.message || 'Unknown error'}. Please try again.`;
      }
      
      console.log('📝 Setting error message:', errorMessage);
      
      setPhoneVerification(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  };


  const PreviewModal = () => (
    previewModal.open && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`rounded-xl max-w-4xl w-full max-h-full overflow-auto ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className={`flex items-center justify-between p-4 border-b ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>{previewModal.title}</h3>
            <div className="flex items-center space-x-2">
              {previewModal.fileType === 'application/pdf' && (
                <button
                  onClick={() => {
                    let pdfUrl = previewModal.image;
                    
                    // Handle Cloudinary URLs properly
                    if (pdfUrl && pdfUrl.includes('cloudinary.com')) {
                      // Convert to proper PDF viewing URL
                      if (pdfUrl.includes('/raw/upload/')) {
                        // Add fl_attachment parameter for better browser compatibility
                        const urlParts = pdfUrl.split('/raw/upload/');
                        pdfUrl = `${urlParts[0]}/raw/upload/fl_attachment/${urlParts[1]}`;
                      } else if (pdfUrl.includes('/image/upload/')) {
                        // Convert image upload URL to raw upload URL for PDFs
                        pdfUrl = pdfUrl.replace('/image/upload/', '/raw/upload/fl_attachment/');
                      }
                    }
                    
                    console.log('Opening PDF URL from modal:', pdfUrl);
                    
                    try {
                      window.open(pdfUrl, '_blank');
                    } catch (error) {
                      console.error('Error opening PDF:', error);
                      // Fallback
                      const link = document.createElement('a');
                      link.href = pdfUrl;
                      link.target = '_blank';
                      link.rel = 'noopener noreferrer';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  }}
                  className={`flex items-center px-3 py-1 text-sm rounded-lg transition-colors cursor-pointer ${
                    isDark 
                      ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/50' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open in New Tab
                </button>
              )}
              <button
                onClick={() => {
                  // Clean up object URL if it was created from a File
                  if (previewModal.image && previewModal.image.startsWith('blob:')) {
                    URL.revokeObjectURL(previewModal.image);
                  }
                  setPreviewModal({ open: false, image: null, title: '', fileType: null });
                }}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-4">
            {previewModal.fileType === 'application/pdf' ? (
              <div className="w-full">
                <div className={`p-4 rounded-lg mb-4 text-center ${
                  isDark ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                  <FileText className={`w-8 h-8 mx-auto mb-2 ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`} />
                  <p className={`text-sm mb-3 ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                  }`}>PDF Document Preview</p>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => {
                        let pdfUrl = previewModal.image;
                        
                        // Handle Cloudinary URLs properly
                        if (pdfUrl && pdfUrl.includes('cloudinary.com')) {
                          // Convert to proper PDF viewing URL
                          if (pdfUrl.includes('/raw/upload/')) {
                            // Add fl_attachment parameter for better browser compatibility
                            const urlParts = pdfUrl.split('/raw/upload/');
                            pdfUrl = `${urlParts[0]}/raw/upload/fl_attachment/${urlParts[1]}`;
                          } else if (pdfUrl.includes('/image/upload/')) {
                            // Convert image upload URL to raw upload URL for PDFs
                            pdfUrl = pdfUrl.replace('/image/upload/', '/raw/upload/fl_attachment/');
                          }
                        }
                        
                        console.log('Opening PDF URL from modal main button:', pdfUrl);
                        
                        try {
                          window.open(pdfUrl, '_blank');
                        } catch (error) {
                          console.error('Error opening PDF:', error);
                          // Fallback: create download link
                          const link = document.createElement('a');
                          link.href = pdfUrl;
                          link.target = '_blank';
                          link.rel = 'noopener noreferrer';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open PDF in New Tab
                    </button>
                    <button
                      onClick={() => {
                        let downloadUrl = previewModal.image;
                        
                        // Handle Cloudinary URLs for download
                        if (downloadUrl && downloadUrl.includes('cloudinary.com')) {
                          // Convert to proper download URL
                          if (downloadUrl.includes('/raw/upload/')) {
                            // Add fl_attachment parameter for proper download
                            const urlParts = downloadUrl.split('/raw/upload/');
                            downloadUrl = `${urlParts[0]}/raw/upload/fl_attachment/${urlParts[1]}`;
                          } else if (downloadUrl.includes('/image/upload/')) {
                            // Convert image upload URL to raw upload URL with download flag
                            downloadUrl = downloadUrl.replace('/image/upload/', '/raw/upload/fl_attachment/');
                          }
                        }
                        
                        console.log('Downloading PDF from URL:', downloadUrl);
                        
                        const link = document.createElement('a');
                        link.href = downloadUrl;
                        link.download = 'document.pdf';
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Download PDF
                    </button>
                  </div>
                </div>
                <div className="w-full h-96 border rounded-lg overflow-hidden bg-gray-100">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-gray-600">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">PDF Document</p>
                      <p className="text-sm mb-4">
                        Click "Open PDF in New Tab" to view the document in your browser
                      </p>
                      <p className="text-xs text-gray-500">
                        Some browsers may not support inline PDF viewing
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <img 
                src={previewModal.image} 
                alt={previewModal.title}
                className="w-full h-auto rounded-lg"
              />
            )}
          </div>
        </div>
      </div>
    )
  );
  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark 
          ? 'bg-gray-900' 
          : 'bg-gradient-to-br from-blue-50 to-indigo-100'
      }`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${
            isDark ? 'border-indigo-400' : 'border-indigo-600'
          }`}></div>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark 
          ? 'bg-gray-900' 
          : 'bg-gradient-to-br from-blue-50 to-indigo-100'
      }`}>
        <div className="text-center">
          <Shield className={`w-16 h-16 mx-auto mb-4 ${
            isDark ? 'text-red-400' : 'text-red-500'
          }`} />
          <h2 className={`text-2xl font-bold mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>Access Denied</h2>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>You need to be a borrower to access KYC verification.</p>
        </div>
      </div>
    );
  }

  // Show existing KYC status if already submitted
  if (user?.kyc?.status) {
    const canResubmit = user.kyc.status === 'rejected' && !user.kyc.maxAttemptsReached;
    const attemptInfo = user.kyc.submissionAttempts ? 
      `${user.kyc.submissionAttempts}/3` : '';

    return (
      <div className={`min-h-screen ${
        isDark 
          ? 'bg-gray-900' 
          : 'bg-gradient-to-br from-blue-50 to-indigo-100'
      }`}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`rounded-2xl shadow-xl p-8 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
        <div className="text-center mb-8">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
            user.kyc.status === 'verified' 
              ? isDark ? 'bg-green-900/30' : 'bg-green-100'
              : user.kyc.status === 'rejected' 
              ? isDark ? 'bg-red-900/30' : 'bg-red-100' 
              : isDark ? 'bg-yellow-900/30' : 'bg-yellow-100'
          }`}>
          {user.kyc.status === 'verified' ? (
            <CheckCircle className={`w-10 h-10 ${
              isDark ? 'text-green-400' : 'text-green-600'
            }`} />
          ) : user.kyc.status === 'rejected' ? (
            <X className={`w-10 h-10 ${
              isDark ? 'text-red-400' : 'text-red-600'
            }`} />
          ) : (
            <Clock className={`w-10 h-10 ${
              isDark ? 'text-yellow-400' : 'text-yellow-600'
            }`} />
          )}
          </div>
          <h1 className={`text-3xl font-bold mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            KYC Status: {user.kyc.status.charAt(0).toUpperCase() + user.kyc.status.slice(1)}
          </h1>
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
            {user.kyc.status === 'verified' && 'Your identity has been successfully verified!'}
            {user.kyc.status === 'rejected' && 'Your KYC submission needs attention.'}
            {user.kyc.status === 'pending' && 'Your documents are being reviewed.'}
          </p>
          
          {/* Show attempt information */}
          {attemptInfo && (
            <div className="mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isDark 
                  ? 'bg-gray-700 text-gray-200' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                Attempt {attemptInfo}
              </span>
            </div>
          )}

          {/* Show rejection reason */}
          {user.kyc.reason && (
            <div className={`mt-4 p-4 rounded-lg ${
              isDark ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <h3 className={`text-sm font-medium mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Review Comments:</h3>
              <p className={`text-sm ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>{user.kyc.reason}</p>
            </div>
          )}

          {/* Show resubmission options */}
          {user.kyc.status === 'rejected' && (
          <div className="mt-6">
            {canResubmit ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
              <div className="flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300">
                Resubmission Available
              </h3>
              </div>
              <p className="text-blue-700 dark:text-blue-300 mb-4 text-sm">
              You can resubmit your KYC documents after addressing the issues mentioned above.
              {attemptInfo && ` You have ${3 - user.kyc.submissionAttempts} attempts remaining.`}
              </p>
              <button
              onClick={() => {
                // Reset the form and allow resubmission
                setUser(prev => ({ ...prev, kyc: null }));
              }}
              className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium cursor-pointer"
              >
              Resubmit KYC Documents
              </button>
            </div>
            ) : (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
              <div className="flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-red-600 dark:text-red-400 mr-3" />
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-300">
                Maximum Attempts Reached
              </h3>
              </div>
              <p className="text-red-700 dark:text-red-300 mb-4 text-sm">
              You have reached the maximum number of KYC submission attempts (3). 
              Please contact our support team for further assistance with your verification process.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                          href="mailto:admin@borrowease.com?subject=KYC%20Assistance%20Required&body=Hello,%0D%0A%0D%0AI%20have%20reached%20the%20maximum%20number%20of%20KYC%20submission%20attempts%20and%20need%20assistance%20with%20my%20verification%20process.%0D%0A%0D%0AUser%20Email:%20${encodeURIComponent(user?.email || '')}%0D%0AUser%20Name:%20${encodeURIComponent(user?.name || '')}%0D%0A%0D%0APlease%20help%20me%20complete%20my%20KYC%20verification.%0D%0A%0D%0AThank%20you."
                          className="bg-red-600 dark:bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors font-medium text-center"
                        >
                          Contact Support
                        </a>
                        <button
                          onClick={() => navigate('/borrower')}
                          className="bg-gray-600 dark:bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors font-medium cursor-pointer"
                        >
                          Back to Dashboard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Show previous submission history if available */}
              {user.kyc.previousSubmissions && user.kyc.previousSubmissions.length > 0 && (
                <div className="mt-6 text-left">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Previous Submissions</h3>
                  <div className="space-y-3">
                    {user.kyc.previousSubmissions.map((submission, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            submission.status === 'verified' ? 'bg-green-100 text-green-800' :
                            submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            Attempt {index + 1}: {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(submission.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {submission.reason && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">{submission.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-blue-50 to-indigo-100'
    }`}>
      <Navbar />
      
      {/* Progress Restored Notification Toast */}
      {showRestoredNotification && (
        <div className="fixed top-20 right-4 z-50 animate-fade-in">
          <div className={`rounded-lg shadow-2xl p-4 flex items-center space-x-3 ${
            isDark ? 'bg-gray-800 border border-green-700' : 'bg-white border border-green-300'
          }`}>
            <div className="flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Progress Restored
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Your previous progress has been restored
              </p>
            </div>
            <button
              onClick={() => setShowRestoredNotification(false)}
              className={`flex-shrink-0 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* OTP Sent Notification Toast */}
      {showOtpSentNotification && (
        <div className="fixed top-20 right-4 z-50 animate-fade-in">
          <div className={`rounded-lg shadow-2xl p-4 flex items-center space-x-3 ${
            isDark ? 'bg-gray-800 border border-blue-700' : 'bg-white border border-blue-300'
          }`}>
            <div className="flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                OTP Sent Successfully
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Check your phone for the verification code
              </p>
            </div>
            <button
              onClick={() => setShowOtpSentNotification(false)}
              className={`flex-shrink-0 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Phone Verified Notification Toast */}
      {showPhoneVerifiedNotification && (
        <div className="fixed top-20 right-4 z-50 animate-fade-in">
          <div className={`rounded-lg shadow-2xl p-4 flex items-center space-x-3 ${
            isDark ? 'bg-gray-800 border border-green-700' : 'bg-white border border-green-300'
          }`}>
            <div className="flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Phone Verified Successfully
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Your phone number has been verified
              </p>
            </div>
            <button
              onClick={() => setShowPhoneVerifiedNotification(false)}
              className={`flex-shrink-0 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* General Toast Notification */}
      {toast.show && (
        <div className="fixed top-20 right-4 z-50 animate-fade-in">
          <div className={`rounded-lg shadow-2xl p-4 flex items-center space-x-3 min-w-[300px] max-w-md ${
            isDark 
              ? toast.type === 'success' ? 'bg-gray-800 border border-green-700' :
                toast.type === 'error' ? 'bg-gray-800 border border-red-700' :
                toast.type === 'warning' ? 'bg-gray-800 border border-yellow-700' :
                'bg-gray-800 border border-blue-700'
              : toast.type === 'success' ? 'bg-white border border-green-300' :
                toast.type === 'error' ? 'bg-white border border-red-300' :
                toast.type === 'warning' ? 'bg-white border border-yellow-300' :
                'bg-white border border-blue-300'
          }`}>
            <div className="flex-shrink-0">
              {toast.type === 'success' && <CheckCircle className="w-6 h-6 text-green-500" />}
              {toast.type === 'error' && <X className="w-6 h-6 text-red-500" />}
              {toast.type === 'warning' && <AlertCircle className="w-6 h-6 text-yellow-500" />}
              {toast.type === 'info' && <CheckCircle className="w-6 h-6 text-blue-500" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast({ show: false, message: '', type: 'info' })}
              className={`flex-shrink-0 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Main Content Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/borrower')}
            className={`flex items-center transition-colors cursor-pointer ${
              isDark 
                ? 'text-indigo-400 hover:text-indigo-300' 
                : 'text-indigo-600 hover:text-indigo-800'
            }`}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <div className={`rounded-full p-3 mr-4 ${
              isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'
            }`}>
              <Shield className={`w-8 h-8 ${
                isDark ? 'text-indigo-400' : 'text-indigo-600'
              }`} />
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}> KYC Verification</h1>
              <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Complete identity verification to unlock all features</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between max-w-2xl">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep > step.id 
                      ? 'bg-green-500 text-white' 
                      : currentStep === step.id 
                      ? 'bg-indigo-600 text-white' 
                      : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    currentStep >= step.id 
                      ? isDark ? 'text-white' : 'text-gray-900'
                      : isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          
        </div>

        {/* Step Content */}
        <div className={`rounded-2xl shadow-xl p-8 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          {currentStep === 1 && (
            <div>
              <h2 className={`text-2xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <User className="w-4 h-4 inline mr-2" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={kycData.personalInfo.fullName}
                    onChange={(e) => handleInputChange('personalInfo', 'fullName', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      errors['personalInfo.fullName'] 
                        ? isDark ? 'border-red-400 bg-gray-700 text-white' : 'border-red-500'
                        : isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'
                    }`}
                    placeholder="Enter your full legal name"
                  />
                  {errors['personalInfo.fullName'] && (
                    <p className={`text-sm mt-1 ${
                      isDark ? 'text-red-400' : 'text-red-600'
                    }`}>{errors['personalInfo.fullName']}</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={kycData.personalInfo.dateOfBirth}
                    onChange={(e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
                    max={new Date().toISOString().split('T')[0]} // Prevent future dates
                    min="1900-01-01" // Reasonable minimum date
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      errors['personalInfo.dateOfBirth'] 
                        ? isDark ? 'border-red-400 bg-gray-700 text-white' : 'border-red-500'
                        : isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'
                    }`}
                  />
                  {kycData.personalInfo.dateOfBirth && calculateAge(kycData.personalInfo.dateOfBirth) !== null && (
                    <p className={`text-sm mt-1 ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Age: {calculateAge(kycData.personalInfo.dateOfBirth)} years
                    </p>
                  )}
                  {errors['personalInfo.dateOfBirth'] && (
                    <p className={`text-sm mt-1 ${
                      isDark ? 'text-red-400' : 'text-red-600'
                    }`}>{errors['personalInfo.dateOfBirth']}</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={kycData.personalInfo.phoneNumber}
                    onChange={(e) => handleInputChange('personalInfo', 'phoneNumber', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      errors['personalInfo.phoneNumber'] 
                        ? isDark ? 'border-red-400 bg-gray-700 text-white' : 'border-red-500'
                        : isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'
                    }`}
                    placeholder="+91 9876543210"
                  />
                  {errors['personalInfo.phoneNumber'] && (
                    <p className={`text-sm mt-1 ${
                      isDark ? 'text-red-400' : 'text-red-600'
                    }`}>{errors['personalInfo.phoneNumber']}</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <Globe className="w-4 h-4 inline mr-2" />
                    Occupation *
                  </label>
                  <input
                    type="text"
                    value={kycData.personalInfo.occupation}
                    onChange={(e) => handleInputChange('personalInfo', 'occupation', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      errors['personalInfo.occupation'] 
                        ? isDark ? 'border-red-400 bg-gray-700 text-white' : 'border-red-500'
                        : isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'
                    }`}
                    placeholder="Student, Employee, Business, etc."
                  />
                  {errors['personalInfo.occupation'] && (
                    <p className={`text-sm mt-1 ${
                      isDark ? 'text-red-400' : 'text-red-600'
                    }`}>{errors['personalInfo.occupation']}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <Home className="w-4 h-4 inline mr-2" />
                    Complete Address *
                  </label>
                  <textarea
                    value={kycData.personalInfo.address}
                    onChange={(e) => handleInputChange('personalInfo', 'address', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      errors['personalInfo.address'] 
                        ? isDark ? 'border-red-400 bg-gray-700 text-white' : 'border-red-500'
                        : isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'
                    }`}
                    rows="3"
                    placeholder="House/Flat No., Street, Area, Landmark"
                  />
                  {errors['personalInfo.address'] && (
                    <p className={`text-sm mt-1 ${
                      isDark ? 'text-red-400' : 'text-red-600'
                    }`}>{errors['personalInfo.address']}</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <MapPin className="w-4 h-4 inline mr-2" />
                    City *
                  </label>
                  <input
                    type="text"
                    value={kycData.personalInfo.city}
                    onChange={(e) => handleInputChange('personalInfo', 'city', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      errors['personalInfo.city'] 
                        ? isDark ? 'border-red-400 bg-gray-700 text-white' : 'border-red-500'
                        : isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'
                    }`}
                    placeholder="Enter your city"
                  />
                  {errors['personalInfo.city'] && (
                    <p className={`text-sm mt-1 ${
                      isDark ? 'text-red-400' : 'text-red-600'
                    }`}>{errors['personalInfo.city']}</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>State *</label>
                  <input
                    type="text"
                    value={kycData.personalInfo.state}
                    onChange={(e) => handleInputChange('personalInfo', 'state', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      errors['personalInfo.state'] 
                        ? isDark ? 'border-red-400 bg-gray-700 text-white' : 'border-red-500'
                        : isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'
                    }`}
                    placeholder="Enter your state"
                  />
                  {errors['personalInfo.state'] && (
                    <p className={`text-sm mt-1 ${
                      isDark ? 'text-red-400' : 'text-red-600'
                    }`}>{errors['personalInfo.state']}</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Pincode *</label>
                  <input
                    type="text"
                    value={kycData.personalInfo.pincode}
                    onChange={(e) => handleInputChange('personalInfo', 'pincode', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      errors['personalInfo.pincode'] 
                        ? isDark ? 'border-red-400 bg-gray-700 text-white' : 'border-red-500'
                        : isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'
                    }`}
                    placeholder="6-digit pincode"
                  />
                  {errors['personalInfo.pincode'] && (
                    <p className={`text-sm mt-1 ${
                      isDark ? 'text-red-400' : 'text-red-600'
                    }`}>{errors['personalInfo.pincode']}</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Monthly Income *</label>
                  <input
                    type="number"
                    value={kycData.personalInfo.monthlyIncome}
                    onChange={(e) => handleInputChange('personalInfo', 'monthlyIncome', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 transition-colors ${
                      errors['personalInfo.monthlyIncome'] 
                        ? isDark ? 'border-red-400 bg-gray-700 text-white' : 'border-red-500'
                        : isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'
                    }`}
                    placeholder="Monthly income in ₹"
                  />
                  {errors['personalInfo.monthlyIncome'] && (
                    <p className={`text-sm mt-1 ${
                      isDark ? 'text-red-400' : 'text-red-600'
                    }`}>{errors['personalInfo.monthlyIncome']}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className={`text-2xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Document Upload</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DocumentUploadCard
                  type="aadharCard"
                  title="Aadhar Card"
                  description="Upload clear image of your Aadhar card (both sides)"
                  icon={CreditCard}
                  required
                  kycData={kycData}
                  errors={errors}
                  handleFileUpload={handleFileUpload}
                  formattedAadhar={formattedAadhar}
                  setFormattedAadhar={setFormattedAadhar}
                  setKycData={setKycData}
                  setErrors={setErrors}
                  setPreviewModal={setPreviewModal}
                  openImagePreview={openImagePreview}
                  uploadProgress={uploadProgress}
                  retryUpload={retryUpload}
                  isDark={isDark}
                />
                <DocumentUploadCard
                  type="panCard"
                  title="PAN Card"
                  description="Upload clear image of your PAN card"
                  icon={CreditCard}
                  required
                  kycData={kycData}
                  errors={errors}
                  handleFileUpload={handleFileUpload}
                  setKycData={setKycData}
                  setErrors={setErrors}
                  setPreviewModal={setPreviewModal}
                  openImagePreview={openImagePreview}
                  uploadProgress={uploadProgress}
                  retryUpload={retryUpload}
                  isDark={isDark}
                />
                <DocumentUploadCard
                  type="selfie"
                  title="Live Selfie"
                  description="Take a clear selfie holding your Aadhar card"
                  icon={Camera}
                  required
                  kycData={kycData}
                  errors={errors}
                  handleFileUpload={handleFileUpload}
                  setKycData={setKycData}
                  setErrors={setErrors}
                  setPreviewModal={setPreviewModal}
                  openImagePreview={openImagePreview}
                  uploadProgress={uploadProgress}
                  retryUpload={retryUpload}
                  isDark={isDark}
                />
                <DocumentUploadCard
                  type="bankStatement"
                  title="Bank Statement"
                  description="Upload last 3 months bank statement (Optional)"
                  icon={FileText}
                  required={false}
                  kycData={kycData}
                  errors={errors}
                  handleFileUpload={handleFileUpload}
                  setKycData={setKycData}
                  setErrors={setErrors}
                  setPreviewModal={setPreviewModal}
                  openImagePreview={openImagePreview}
                  uploadProgress={uploadProgress}
                  retryUpload={retryUpload}
                  isDark={isDark}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className={`text-2xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Verification Steps</h2>
              <div className="space-y-6">
                {/* Phone Verification */}
                <div className={`p-4 rounded-lg ${
                  isDark ? 'bg-blue-900/30' : 'bg-blue-50'
                }`}>
                  <div className="flex items-center mb-4">
                    <Smartphone className={`w-6 h-6 mr-3 ${
                      isDark ? 'text-blue-400' : 'text-blue-600'
                    }`} />
                    <div className="flex-1">
                      <h3 className={`font-semibold ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>Phone Verification</h3>
                      <p className={`text-sm ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                      }`}>Verify your phone number with OTP</p>
                    </div>
                    {phoneVerification.step === 'verified' && (
                      <CheckCircle className={`w-6 h-6 ${
                        isDark ? 'text-green-400' : 'text-green-600'
                      }`} />
                    )}
                  </div>

                  {phoneVerification.step === 'phone' && (
                    <div className="space-y-3">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          placeholder="Enter your 10-digit phone number"
                          value={phoneVerification.phoneNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setPhoneVerification(prev => ({
                              ...prev,
                              phoneNumber: value,
                              error: null
                            }));
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                            isDark 
                              ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                              : 'border-gray-300'
                          }`}
                          maxLength={10}
                        />
                        {phoneVerification.phoneNumber && phoneVerification.phoneNumber.length < 10 && (
                          <p className={`text-xs mt-1 ${
                            isDark ? 'text-yellow-400' : 'text-yellow-600'
                          }`}>
                            Enter a 10-digit mobile number
                          </p>
                        )}
                      </div>
                      <button 
                        onClick={sendOTP}
                        disabled={phoneVerification.loading || phoneVerification.phoneNumber.length !== 10}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        {phoneVerification.loading ? 'Sending OTP...' : 'Send OTP'}
                      </button>
                    </div>
                  )}

                  {phoneVerification.step === 'otp' && (
                    <div className="space-y-4">
                      <div className={`p-3 rounded-lg ${
                        isDark ? 'bg-green-900/30' : 'bg-green-50'
                      }`}>
                        <p className={`text-sm ${
                          isDark ? 'text-green-400' : 'text-green-600'
                        }`}>
                          📱 OTP sent to +91{phoneVerification.phoneNumber}
                        </p>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Enter OTP
                        </label>
                        <input
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={phoneVerification.otp}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setPhoneVerification(prev => ({
                              ...prev,
                              otp: value,
                              error: null
                            }));
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 transition-colors ${
                            isDark 
                              ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                              : 'border-gray-300'
                          }`}
                          maxLength={6}
                        />
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={verifyOTP}
                          disabled={phoneVerification.loading || phoneVerification.otp.length !== 6}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          {phoneVerification.loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                        
                        <button 
                          onClick={() => {
                            resetPhoneVerification();
                          }}
                          disabled={phoneVerification.loading}
                          className={`px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                            isDark 
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                              : 'bg-gray-500 text-white hover:bg-gray-600'
                          }`}
                        >
                          Change Number
                        </button>
                        
                        <button 
                          onClick={async () => {
                            setPhoneVerification(prev => ({
                              ...prev,
                              otp: '',
                              error: null,
                              loading: true
                            }));
                            
                            // Add a small delay to show loading state
                            setTimeout(async () => {
                              try {
                                await sendOTP();
                              } catch (error) {
                                setPhoneVerification(prev => ({
                                  ...prev,
                                  loading: false,
                                  error: 'Failed to resend OTP. Please try again.'
                                }));
                              }
                            }, 100);
                          }}
                          disabled={phoneVerification.loading}
                          className={`px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                            phoneVerification.loading
                              ? (isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-300 text-gray-500') + ' cursor-not-allowed'
                              : (isDark 
                                  ? 'bg-yellow-800 text-yellow-300 hover:bg-yellow-700' 
                                  : 'bg-yellow-500 text-white hover:bg-yellow-600')
                          }`}
                        >
                          {phoneVerification.loading ? 'Sending...' : 'Resend OTP'}
                        </button>
                      </div>
                    </div>
                  )}

                  {phoneVerification.step === 'verified' && (
                    <div className="space-y-3">
                      <div className={`flex items-center ${
                        isDark ? 'text-green-400' : 'text-green-600'
                      }`}>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        <span>Phone verified successfully! (+91{phoneVerification.phoneNumber})</span>
                      </div>
                      
                      {/* Option to change verified number if needed */}
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to change your verified phone number? You will need to verify the new number again.')) {
                            localStorage.removeItem('phoneVerified');
                            resetPhoneVerification();
                          }
                        }}
                        className={`text-sm px-3 py-1 rounded transition-colors ${
                          isDark 
                            ? 'text-blue-400 hover:bg-blue-900/50' 
                            : 'text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        Change Number
                      </button>
                    </div>
                  )}

                  {phoneVerification.error && (
                    <div className={`p-3 rounded-lg ${
                      isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className={`text-sm ${
                        isDark ? 'text-red-400' : 'text-red-600'
                      }`}>{phoneVerification.error}</p>
                      
                      {phoneVerification.error.includes('reCAPTCHA') || phoneVerification.error.includes('Verification failed') ? (
                        <div className="mt-2 space-x-2">
                          <button
                            onClick={async () => {
                              console.log('💥 Start Fresh clicked - performing nuclear reset');
                              
                              // Show loading state
                              setPhoneVerification(prev => ({
                                ...prev,
                                loading: true,
                                error: 'Performing complete system reset...'
                              }));
                              
                              try {
                                // Nuclear reset with retries
                                let resetSuccess = false;
                                for (let i = 0; i < 3; i++) {
                                  console.log(`💣 Nuclear reset attempt ${i + 1}`);
                                  resetSuccess = nuclearRecaptchaReset();
                                  if (resetSuccess) break;
                                  await new Promise(resolve => setTimeout(resolve, 1000));
                                }
                                
                                if (!resetSuccess) {
                                  console.log('⚠️ Nuclear reset failed, using fallback');
                                  clearAllRecaptcha();
                                }
                                
                                // Wait for system to stabilize
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                
                                // Reset completely
                                resetPhoneVerification();
                                
                                console.log('✅ Start Fresh completed - system fully reset');
                              } catch (error) {
                                console.error('❌ Error during Start Fresh:', error);
                                setPhoneVerification(prev => ({
                                  ...prev,
                                  loading: false,
                                  error: 'Reset failed. Please refresh the page.'
                                }));
                              }
                            }}
                            disabled={phoneVerification.loading}
                            className={`text-xs px-3 py-1 rounded transition-colors ${
                              phoneVerification.loading
                                ? (isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-300 text-gray-500') + ' cursor-not-allowed'
                                : (isDark 
                                    ? 'bg-red-900/50 text-red-300 hover:bg-red-800/50' 
                                    : 'bg-red-100 text-red-700 hover:bg-red-200')
                            }`}
                          >
                            {phoneVerification.loading ? 'Resetting...' : 'Start Fresh'}
                          </button>
                          
                          <button
                            onClick={() => {
                              console.log('Refreshing page to completely reset state...');
                              window.location.reload();
                            }}
                            className={`text-xs px-3 py-1 rounded transition-colors ${
                              isDark 
                                ? 'bg-red-900/50 text-red-300 hover:bg-red-800/50' 
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            Refresh Page
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* <div className={`flex items-center p-4 rounded-lg ${
                  isDark ? 'bg-purple-900/30' : 'bg-purple-50'
                }`}>
                  <Lock className={`w-6 h-6 mr-3 ${
                    isDark ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                  <div className="flex-1">
                    <h3 className={`font-semibold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>Biometric Verification</h3>
                    <p className={`text-sm ${
                      isDark ? 'text-gray-300' : 'text-gray-600'
                    }`}>Facial recognition verification</p>
                  </div>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">
                    Verify Face
                  </button>
                </div> */}

                <div className={`p-4 rounded-lg ${
                  isDark ? 'bg-green-900/30' : 'bg-green-50'
                }`}>
                  <div className="flex items-center mb-3">
                    <MapPin className={`w-6 h-6 mr-3 ${
                      isDark ? 'text-green-400' : 'text-green-600'
                    }`} />
                    <div className="flex-1">
                      <h3 className={`font-semibold ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>Address Verification</h3>
                      <p className={`text-sm ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                      }`}>Upload a utility bill or bank statement as address proof</p>
                    </div>
                  </div>

                  {addressVerification.step === 'pending' && (
                    <div className="space-y-3">
                      <label className={`block text-sm font-medium mb-2 ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Select Document Type
                      </label>
                      <select
                        value={addressVerification.selectedDocument}
                        onChange={(e) => setAddressVerification(prev => ({
                          ...prev,
                          selectedDocument: e.target.value
                        }))}
                        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                          isDark 
                            ? 'border-gray-600 bg-gray-700 text-white' 
                            : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select document type</option>
                        <option value="utility_bill">Utility Bill (Electricity/Gas/Water)</option>
                        <option value="bank_statement">Bank Statement</option>
                        <option value="aadhar">Aadhar Card</option>
                      </select>
                      
                      {addressVerification.selectedDocument && (
                        <button
                          onClick={() => setAddressVerification(prev => ({
                            ...prev,
                            step: 'document_upload'
                          }))}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer"
                        >
                          Proceed to Upload
                        </button>
                      )}
                    </div>
                  )}

                  {addressVerification.step === 'document_upload' && (
                    <div className="space-y-3">
                      <div className={`text-sm mb-2 ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Upload your {addressVerification.selectedDocument.replace('_', ' ')} as address proof
                      </div>
                      
                      <div className={`border-2 border-dashed rounded-lg p-4 ${
                        isDark 
                          ? 'border-green-600/30 bg-green-900/10' 
                          : 'border-green-300'
                      }`}>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setAddressVerification(prev => ({
                                ...prev,
                                uploadedDocument: file
                              }));
                            }
                          }}
                          className={`w-full ${
                            isDark ? 'text-white file:bg-gray-700 file:text-white file:border-gray-600' : ''
                          }`}
                        />
                        <p className={`text-xs mt-1 ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Accepted formats: PDF, JPG, PNG (Max 5MB)
                        </p>
                      </div>

                      {addressVerification.uploadedDocument && (
                        <div className="flex items-center space-x-2">
                          <FileText className={`w-4 h-4 ${
                            isDark ? 'text-green-400' : 'text-green-600'
                          }`} />
                          <span className={`text-sm ${
                            isDark ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {addressVerification.uploadedDocument.name}
                          </span>
                        </div>
                      )}

                      <div className="flex space-x-3">
                        <button
                          onClick={() => setAddressVerification(prev => ({
                            ...prev,
                            step: 'pending',
                            selectedDocument: '',
                            uploadedDocument: null
                          }))}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 cursor-pointer"
                        >
                          Back
                        </button>
                        {addressVerification.uploadedDocument && (
                          <button
                            onClick={() => {
                              setAddressVerification(prev => ({
                                ...prev,
                                step: 'submitted',
                                loading: true
                              }));
                              
                              // Update KYC data with address verification info
                              setKycData(prev => ({
                                ...prev,
                                addressVerificationData: {
                                  documentType: addressVerification.selectedDocument,
                                  documentFile: addressVerification.uploadedDocument,
                                  status: 'submitted'
                                },
                                verification: {
                                  ...prev.verification,
                                  addressVerification: false // Will be true when admin approves
                                }
                              }));
                              
                              // Simulate upload process
                              setTimeout(() => {
                                setAddressVerification(prev => ({
                                  ...prev,
                                  loading: false
                                }));
                              }, 2000);
                            }}
                            disabled={addressVerification.loading}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 cursor-pointer"
                          >
                            {addressVerification.loading ? 'Uploading...' : 'Submit Document'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {addressVerification.step === 'submitted' && (
                    <div className="text-center space-y-3">
                      <div className="flex items-center justify-center text-yellow-600">
                        <Clock className="w-5 h-5 mr-2" />
                        <span>Document submitted for admin review</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Your address verification document has been submitted and is being reviewed by our admin team.
                      </p>
                    </div>
                  )}

                  {addressVerification.step === 'verified' && (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span>Address verified successfully!</span>
                    </div>
                  )}

                  {addressVerification.error && (
                    <p className="text-red-600 text-sm mt-2">{addressVerification.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h2 className={`text-2xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>Review & Submit</h2>
              
              {/* Personal Info Summary */}
              <div className="mb-8">
                <h3 className={`text-lg font-semibold mb-4 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Personal Information</h3>
                <div className={`p-4 rounded-lg ${
                  isDark ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      <strong className={isDark ? 'text-white' : 'text-gray-900'}>Name:</strong> {kycData.personalInfo.fullName}
                    </div>
                    <div className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      <strong className={isDark ? 'text-white' : 'text-gray-900'}>DOB:</strong> {kycData.personalInfo.dateOfBirth}
                    </div>
                    <div className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      <strong className={isDark ? 'text-white' : 'text-gray-900'}>Phone:</strong> {kycData.personalInfo.phoneNumber}
                    </div>
                    <div className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      <strong className={isDark ? 'text-white' : 'text-gray-900'}>City:</strong> {kycData.personalInfo.city}
                    </div>
                    <div className={`md:col-span-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      <strong className={isDark ? 'text-white' : 'text-gray-900'}>Address:</strong> {kycData.personalInfo.address}
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents Summary */}
              <div className="mb-8">
                <h3 className={`text-lg font-semibold mb-4 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Documents Uploaded</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(kycData.documents).map(([key, doc]) => (
                    doc.file && (
                      <div key={key} className={`flex items-center p-3 rounded-lg ${
                        isDark ? 'bg-green-900/30 border border-green-700/30' : 'bg-green-50'
                      }`}>
                        <CheckCircle className={`w-5 h-5 mr-3 ${
                          isDark ? 'text-green-400' : 'text-green-600'
                        }`} />
                        <span className={`text-sm font-medium capitalize ${
                          isDark ? 'text-green-300' : 'text-green-800'
                        }`}>
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                      </div>
                    )
                  ))}
                  
                  {/* Address Verification Document */}
                  {kycData.addressVerificationData.documentFile && (
                    <div className={`flex items-center p-3 rounded-lg ${
                      isDark ? 'bg-green-900/30 border border-green-700/30' : 'bg-green-50'
                    }`}>
                      <CheckCircle className={`w-5 h-5 mr-3 ${
                        isDark ? 'text-green-400' : 'text-green-600'
                      }`} />
                      <span className={`text-sm font-medium ${
                        isDark ? 'text-green-300' : 'text-green-800'
                      }`}>
                        Address Proof ({kycData.addressVerificationData.documentType.replace('_', ' ')})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Status Summary */}
              <div className="mb-8">
                <h3 className={`text-lg font-semibold mb-4 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>Verification Status</h3>
                <div className="space-y-3">
                  <div className={`flex items-center justify-between p-3 rounded-lg ${
                    isDark ? 'bg-gray-700/50' : 'bg-gray-50'
                  }`}>
                    <span className={`text-sm font-medium ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>Phone Verification</span>
                    {phoneVerification.step === 'verified' ? (
                      <div className={`flex items-center ${
                        isDark ? 'text-green-400' : 'text-green-600'
                      }`}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm">Verified</span>
                      </div>
                    ) : (
                      <div className={`flex items-center ${
                        isDark ? 'text-yellow-400' : 'text-yellow-600'
                      }`}>
                        <Clock className="w-4 h-4 mr-1" />
                        <span className="text-sm">Pending</span>
                      </div>
                    )}
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-lg ${
                    isDark ? 'bg-gray-700/50' : 'bg-gray-50'
                  }`}>
                    <span className={`text-sm font-medium ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>Address Verification</span>
                    {addressVerification.step === 'verified' ? (
                      <div className={`flex items-center ${
                        isDark ? 'text-green-400' : 'text-green-600'
                      }`}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm">Verified</span>
                      </div>
                    ) : addressVerification.step === 'submitted' ? (
                      <div className={`flex items-center ${
                        isDark ? 'text-yellow-400' : 'text-yellow-600'
                      }`}>
                        <Clock className="w-4 h-4 mr-1" />
                        <span className="text-sm">Under Review</span>
                      </div>
                    ) : (
                      <div className={`flex items-center ${
                        isDark ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        <X className="w-4 h-4 mr-1" />
                        <span className="text-sm">Not Started</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className={`border rounded-lg p-4 mb-6 ${
                isDark 
                  ? 'bg-yellow-900/20 border-yellow-600/30' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-start">
                  <AlertCircle className={`w-5 h-5 mr-3 mt-0.5 ${
                    isDark ? 'text-yellow-400' : 'text-yellow-600'
                  }`} />
                  <div className="text-sm">
                    <p className={`font-medium mb-2 ${
                      isDark ? 'text-yellow-300' : 'text-yellow-800'
                    }`}>Important:</p>
                    <ul className={`list-disc list-inside space-y-1 ${
                      isDark ? 'text-yellow-200' : 'text-yellow-700'
                    }`}>
                      <li>All information provided must be accurate and verifiable</li>
                      <li>KYC verification typically takes 24-48 hours</li>
                      <li>You'll receive email notifications about the status</li>
                      <li>Providing false information may result in account suspension</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center mb-6">
                <input
                  type="checkbox"
                  id="terms"
                  className={`w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 ${
                    isDark 
                      ? 'border-gray-600 bg-gray-700 checked:bg-indigo-600 checked:border-indigo-600' 
                      : 'border-gray-300 bg-white'
                  }`}
                />
                <label htmlFor="terms" className={`ml-2 text-sm cursor-pointer ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  I confirm that all information provided is accurate and I agree to the terms and conditions
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className={`flex justify-between mt-8 pt-6 border-t ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-lg font-medium cursor-pointer transition-colors ${
                currentStep === 1
                  ? isDark 
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Previous
            </button>

            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                className={`px-6 py-3 rounded-lg font-medium cursor-pointer transition-colors ${
                  isDark 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={submitKYC}
                disabled={uploading}
                className={`px-6 py-3 rounded-lg font-medium disabled:opacity-50 cursor-pointer transition-colors ${
                  isDark 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {uploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  'Submit KYC'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Features Banner */}
        <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Unlock Premium Features</h2>
            <p className="text-indigo-100 mb-6">Complete KYC verification to access advanced features</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Zap className="w-8 h-8 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Instant Approvals</h3>
                <p className="text-sm text-indigo-100">Get loans approved in minutes</p>
              </div>
              <div className="text-center">
                <Award className="w-8 h-8 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Higher Limits</h3>
                <p className="text-sm text-indigo-100">Access larger loan amounts</p>
              </div>
              <div className="text-center">
                <Shield className="w-8 h-8 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Better Rates</h3>
                <p className="text-sm text-indigo-100">Get competitive interest rates</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal />

      {/* Enhanced Loading Overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className={`rounded-lg p-8 text-center max-w-sm mx-4 ${
            isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`}>
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>Processing Upload</h3>
            <p className={`text-sm ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Please wait while we securely upload and process your document...
            </p>
            <div className="mt-4 flex items-center justify-center space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Image Preview Modal */}
      {showPreviewModal && previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closeImagePreview}>
          <div className="relative max-w-4xl max-h-[90vh] m-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeImagePreview}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 z-10 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 right-4 text-center">
              <p className="text-white bg-black bg-opacity-50 px-4 py-2 rounded-lg">
                {previewImage.title}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Invisible reCAPTCHA container */}
      <div 
        ref={recaptchaContainerRef}
        id="recaptcha-container" 
        className="recaptcha-container"
        style={{ 
          position: 'absolute', 
          bottom: '0', 
          left: '0', 
          opacity: 0, 
          pointerEvents: 'none',
          height: '1px',
          overflow: 'hidden'
        }}
      ></div>
    </div>
  );
}

export default EnhancedKYCPage;
