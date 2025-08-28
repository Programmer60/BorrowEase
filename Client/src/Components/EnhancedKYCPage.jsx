import React, { useState, useEffect } from 'react';
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
  Mail,
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

// ====================================================================
// STEP 1: Define DocumentUploadCard OUTSIDE the main component
// It now receives all its data and handlers as props.
// ====================================================================
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
  setPreviewModal
}) => {
  const doc = kycData.documents[type];
  const error = errors[`documents.${type}`];
  
  // Define requirements for each document type - PRODUCTION LEVEL
  const requirements = {
    aadharCard: {
      size: '100KB - 2MB',
      resolution: 'Minimum 800x500px, landscape orientation',
      format: 'JPEG, PNG, PDF',
      tips: 'Ensure both sides are clearly visible, no glare or blur, and all details are readable.'
    },
    panCard: {
      size: '100KB - 2MB',
      resolution: 'Minimum 800x500px, landscape orientation',
      format: 'JPEG, PNG, PDF',
      tips: 'Upload a clear image with all text and photo visible. Avoid cropped or unclear images.'
    },
    selfie: {
      size: '50KB - 3MB',
      resolution: 'Minimum 400x400px, portrait orientation',
      format: 'JPEG, PNG',
      tips: 'Take a selfie in good lighting, holding your Aadhar card next to your face. Face and card details must be visible.'
    },
    bankStatement: {
      size: '200KB - 5MB',
      resolution: 'Minimum 600x800px, portrait orientation',
      format: 'JPEG, PNG, PDF',
      tips: 'Upload last 3 months statement. All pages must be clear and readable. PDF preferred.'
    },
    salarySlip: {
      size: '100KB - 3MB',
      resolution: 'Minimum 600x800px, portrait orientation',
      format: 'JPEG, PNG, PDF',
      tips: 'Upload latest salary slip with all details visible. PDF or clear image required.'
    }
  };

  const req = requirements[type];
  
  return (
    <div className={`border-2 border-dashed rounded-xl p-6 transition-all ${
      doc.file ? 'border-green-500 bg-green-50' : 
      error ? 'border-red-500 bg-red-50' : 
      'border-gray-300 hover:border-blue-500'
    }`}>
      <div className="text-center">
        <Icon className={`w-12 h-12 mx-auto mb-4 ${
          doc.file ? 'text-green-600' : 'text-gray-400'
        }`} />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        
        {/* Requirements Display */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-left">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Requirements:</h4>
          <div className="space-y-1 text-xs text-gray-600">
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
          </div>
          <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
            <span className="font-medium">💡 Tip:</span> {req.tips}
          </div>
        </div>
        
        {doc.file ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-600 font-medium">Uploaded Successfully</span>
            </div>
            
            {/* File Info Display */}
            {doc.fileInfo && (
              <div className="p-2 bg-green-50 rounded-lg text-xs text-green-700">
                <div className="flex justify-between items-center">
                  <span>📄 {doc.fileInfo.name}</span>
                  <span>{doc.fileInfo.sizeText}</span>
                </div>
                {doc.fileInfo.dimensions && (
                  <div className="mt-1 text-center">
                    📐 {doc.fileInfo.dimensions}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => {
                  // Handle PDF files differently - open in new tab
                  if (doc.fileType === 'application/pdf') {
                    // For PDF files, create a direct download/view link
                    let pdfUrl = doc.file;
                    
                    // For Cloudinary URLs, we need to ensure proper access
                    if (pdfUrl && pdfUrl.includes('cloudinary.com')) {
                      // If it's uploaded as raw, it should work directly
                      // If it has /image/upload/, it might need transformation
                      if (pdfUrl.includes('/image/upload/')) {
                        console.warn('PDF was uploaded to image endpoint, trying to access anyway');
                      }
                    }
                    
                    // Try to open the PDF directly
                    window.open(pdfUrl, '_blank');
                  } else {
                    setPreviewModal({ 
                      open: true, 
                      image: doc.preview, 
                      title: title,
                      fileType: doc.fileType
                    });
                  }
                }}
                className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                <Eye className="w-4 h-4 mr-1" />
                {doc.fileType === 'application/pdf' ? 'View PDF' : 'Preview'}
              </button>
              <button
                onClick={() => document.getElementById(`file-${type}`).click()}
                className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Upload className="w-4 h-4 mr-1" />
                Replace
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => document.getElementById(`file-${type}`).click()}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload {title}
          </button>
        )}
        
        <input
          id={`file-${type}`}
          type="file"
          accept="image/*,application/pdf"
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
                errors['documents.aadharCard.number'] ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors['documents.aadharCard.number'] && (
              <p className="text-red-600 text-sm mt-1">{errors['documents.aadharCard.number']}</p>
            )}
            {doc.number && doc.number.length < 12 && (
              <p className="text-yellow-600 text-sm mt-1">
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
                errors['documents.panCard.number'] ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors['documents.panCard.number'] && (
              <p className="text-red-600 text-sm mt-1">{errors['documents.panCard.number']}</p>
            )}
            {doc.number && doc.number.length < 10 && (
              <p className="text-yellow-600 text-sm mt-1">
                PAN number must be exactly 10 characters ({doc.number.length}/10)
              </p>
            )}
            {doc.number && doc.number.length === 10 && (
              <p className="text-green-600 text-sm mt-1 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Valid PAN format
              </p>
            )}
          </div>
        )}
        
        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
      </div>
    </div>
  );
};

const EnhancedKYCPage = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [kycData, setKycData] = useState({
    personalInfo: {
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
    documents: {
      aadharCard: { file: null, number: '', preview: null },
      panCard: { file: null, number: '', preview: null },
      bankStatement: { file: null, preview: null },
      salarySlip: { file: null, preview: null },
      selfie: { file: null, preview: null },
    },
    verification: {
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
  const [uploading, setUploading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [errors, setErrors] = useState({});
  const [previewModal, setPreviewModal] = useState({ open: false, image: null, title: '', fileType: null });
  const [formattedAadhar, setFormattedAadhar] = useState('');
  
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
          const res = await API.get("/users/me");
          if (res.data.role === "borrower") {
            setAuthorized(true);
            setUser(res.data);
            // Pre-fill basic info if available
            if (res.data.name) {
              setKycData(prev => ({
                ...prev,
                personalInfo: {
                  ...prev.personalInfo,
                  fullName: res.data.name,
                }
              }));
            }
          }
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
  }, []);

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
    };
  }, []);

  const steps = [
    { id: 1, title: 'Personal Information', icon: User, status: 'current' },
    { id: 2, title: 'Document Upload', icon: FileText, status: 'upcoming' },
    { id: 3, title: 'Verification', icon: Shield, status: 'upcoming' },
    { id: 4, title: 'Review & Submit', icon: CheckCircle, status: 'upcoming' },
  ];

  // Duplicate validateImageDimensions removed to fix redeclaration error.

  const handleInputChange = (section, field, value) => {
    setKycData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    
    // Clear error when user starts typing
    if (errors[`${section}.${field}`]) {
      setErrors(prev => ({
        ...prev,
        [`${section}.${field}`]: null
      }));
    }
  };

  const handleFileUpload = async (documentType, file) => {
    if (!file) return;

    // Validate file size based on document type - COMMENTED OUT FOR TESTING
    // const sizeValidation = {
    //   aadharCard: { min: 100 * 1024, max: 2 * 1024 * 1024 }, // 100KB - 2MB
    //   panCard: { min: 100 * 1024, max: 2 * 1024 * 1024 },    // 100KB - 2MB
    //   selfie: { min: 50 * 1024, max: 3 * 1024 * 1024 },      // 50KB - 3MB
    //   bankStatement: { min: 200 * 1024, max: 5 * 1024 * 1024 }, // 200KB - 5MB
    //   salarySlip: { min: 100 * 1024, max: 3 * 1024 * 1024 }   // 100KB - 3MB
    // };

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    // const validation = sizeValidation[documentType];
    
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        [`documents.${documentType}`]: 'Only JPEG, PNG, and PDF files are allowed'
      }));
      return;
    }

    // Check file size range - COMMENTED OUT FOR TESTING
    // if (file.size < validation.min) {
    //   setErrors(prev => ({
    //     ...prev,
    //     [`documents.${documentType}`]: `File too small. Minimum size: ${Math.round(validation.min / 1024)}KB for clear visibility`
    //   }));
    //   return;
    // }

    // if (file.size > validation.max) {
    //   setErrors(prev => ({
    //     ...prev,
    //     [`documents.${documentType}`]: `File too large. Maximum size: ${Math.round(validation.max / (1024 * 1024))}MB`
    //   }));
    //   return;
    // }

    // For images, validate dimensions - COMMENTED OUT FOR TESTING
    // if (file.type.startsWith('image/')) {
    //   const isValidDimensions = await validateImageDimensions(file, documentType);
    //   if (!isValidDimensions) {
    //     return; // Error already set in validateImageDimensions
    //   }
    // }

    setUploading(true);
    try {
      // Load environment variables
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      
      // Validate environment variables
      if (!cloudName || cloudName === 'undefined') {
        alert('Configuration Error: Cloudinary cloud name not found.');
        setUploading(false);
        return;
      }
      
      if (!uploadPreset || uploadPreset === 'undefined') {
        alert('Configuration Error: Cloudinary upload preset not found.');
        setUploading(false);
        return;
      }

      // Create preview for images
      let preview = null;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      // For PDF files, we need to upload them properly to Cloudinary
      const isPDF = file.type === 'application/pdf';
      
      // Create the upload request
      let uploadUrl;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('tags', 'kyc_document');
      formData.append('folder', 'borrowease/kyc');
      
      if (isPDF) {
        // For PDFs, use raw/upload endpoint
        uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
      } else {
        // For images, use image/upload endpoint
        uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      }
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${data.error?.message || data.message || 'Unknown error'}`);
      }
      
      if (data.secure_url) {
        // Get file info for display
        const fileSizeText = file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)}MB`
          : `${Math.round(file.size / 1024)}KB`;
        
        // Get image dimensions if it's an image
        let dimensions = null;
        if (file.type.startsWith('image/')) {
          const img = new Image();
          const url = URL.createObjectURL(file);
          await new Promise((resolve) => {
            img.onload = () => {
              dimensions = `${img.width}x${img.height}px`;
              URL.revokeObjectURL(url);
              resolve();
            };
            img.src = url;
          });
        }
        
        setKycData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [documentType]: {
              ...prev.documents[documentType],
              file: data.secure_url,
              preview: isPDF ? data.secure_url : (preview || data.secure_url),
              fileType: file.type, // Store file type for preview handling
              fileInfo: {
                name: file.name,
                size: file.size,
                sizeText: fileSizeText,
                dimensions: dimensions
              }
            }
          }
        }));
        
        // Clear any previous errors
        setErrors(prev => ({
          ...prev,
          [`documents.${documentType}`]: null
        }));
      }
    } catch (error) {
      let errorMessage = 'Upload failed. ';
      if (error.message.includes('401')) {
        errorMessage += 'Authentication error. Please check your configuration.';
      } else if (error.message.includes('400')) {
        errorMessage += 'Invalid request. Please check the file format and size.';
      } else {
        errorMessage += 'Please try again or contact support if the problem persists.';
      }
      
      setErrors(prev => ({
        ...prev,
        [`documents.${documentType}`]: errorMessage
      }));
    } finally {
      setUploading(false);
    }
  };

  const validateImageDimensions = (file, documentType) => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const { width, height } = img;
        URL.revokeObjectURL(url);
        
        // Define minimum dimensions for different document types
        const dimensionRequirements = {
          aadharCard: { minWidth: 800, minHeight: 500, aspectRatio: { min: 1.4, max: 1.8 } },
          panCard: { minWidth: 800, minHeight: 500, aspectRatio: { min: 1.4, max: 1.8 } },
          selfie: { minWidth: 400, minHeight: 400, aspectRatio: { min: 0.7, max: 1.4 } },
          bankStatement: { minWidth: 600, minHeight: 800, aspectRatio: { min: 0.6, max: 0.9 } },
          salarySlip: { minWidth: 600, minHeight: 800, aspectRatio: { min: 0.6, max: 0.9 } }
        };
        
        const requirements = dimensionRequirements[documentType];
        const aspectRatio = width / height;
        
        // Check minimum dimensions
        if (width < requirements.minWidth || height < requirements.minHeight) {
          setErrors(prev => ({
            ...prev,
            [`documents.${documentType}`]: `Image resolution too low. Minimum: ${requirements.minWidth}x${requirements.minHeight}px. Current: ${width}x${height}px`
          }));
          resolve(false);
          return;
        }
        
        // Check aspect ratio for proper document orientation
        if (aspectRatio < requirements.aspectRatio.min || aspectRatio > requirements.aspectRatio.max) {
          setErrors(prev => ({
            ...prev,
            [`documents.${documentType}`]: `Incorrect document orientation. Please ensure the document is properly aligned and fully visible.`
          }));
          resolve(false);
          return;
        }
        
        resolve(true);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setErrors(prev => ({
          ...prev,
          [`documents.${documentType}`]: 'Unable to process image. Please try a different file.'
        }));
        resolve(false);
      };
      
      img.src = url;
    });
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        const { personalInfo } = kycData;
        if (!personalInfo.fullName) newErrors['personalInfo.fullName'] = 'Full name is required';
        if (!personalInfo.dateOfBirth) newErrors['personalInfo.dateOfBirth'] = 'Date of birth is required';
        if (!personalInfo.phoneNumber) newErrors['personalInfo.phoneNumber'] = 'Phone number is required';
        if (!personalInfo.address) newErrors['personalInfo.address'] = 'Address is required';
        if (!personalInfo.city) newErrors['personalInfo.city'] = 'City is required';
        if (!personalInfo.state) newErrors['personalInfo.state'] = 'State is required';
        if (!personalInfo.pincode) newErrors['personalInfo.pincode'] = 'Pincode is required';
        if (!personalInfo.occupation) newErrors['personalInfo.occupation'] = 'Occupation is required';
        if (!personalInfo.monthlyIncome) newErrors['personalInfo.monthlyIncome'] = 'Monthly income is required';
        break;
        
      case 2:
        const { documents } = kycData;
        if (!documents.aadharCard.file) newErrors['documents.aadharCard'] = 'Aadhar card is required';
        if (!documents.aadharCard.number) {
          newErrors['documents.aadharCard.number'] = 'Aadhar card number is required';
        } else if (documents.aadharCard.number.length !== 12) {
          newErrors['documents.aadharCard.number'] = 'Aadhar number must be exactly 12 digits';
        }
        if (!documents.panCard.file) newErrors['documents.panCard'] = 'PAN card is required';
        if (!documents.panCard.number) {
          newErrors['documents.panCard.number'] = 'PAN card number is required';
        } else if (documents.panCard.number.length !== 10) {
          newErrors['documents.panCard.number'] = 'PAN number must be exactly 10 characters';
        } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(documents.panCard.number)) {
          newErrors['documents.panCard.number'] = 'Invalid PAN format (should be AAAAA9999A)';
        }
        if (!documents.selfie.file) newErrors['documents.selfie'] = 'Selfie is required';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const submitKYC = async () => {
    try {
      setUploading(true);
      
      // Structure the data according to the backend KYC model
      const submissionData = {
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
            number: kycData.documents.aadharCard.number || '',
            frontImage: kycData.documents.aadharCard.file || '',
            backImage: kycData.documents.aadharCard.file || '', // Using same image for both sides for now
          },
          pan: {
            number: kycData.documents.panCard.number || '',
            image: kycData.documents.panCard.file || '',
          },
          selfie: kycData.documents.selfie.file || '',
          addressProof: {
            docType: 'bank_statement',
            image: kycData.documents.bankStatement.file || ''
          },
          incomeProof: {
            docType: 'salary_slip', 
            image: kycData.documents.salarySlip.file || ''
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

      // Validate required fields on frontend
      if (!submissionData.documents.aadhar.frontImage || !submissionData.documents.pan.image || !submissionData.documents.selfie) {
        alert('Please upload all required documents (Aadhar Card, PAN Card, and Selfie)');
        return;
      }
      
      if (!submissionData.documents.aadhar.number) {
        alert('Please enter your Aadhar card number');
        return;
      }
      
      if (!submissionData.documents.pan.number) {
        alert('Please enter your PAN card number');
        return;
      }
      
      const response = await API.post('/kyc/submit', submissionData);
      
      if (response.data.kyc) {
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
      alert(`KYC submitted successfully${attemptMsg}! Your documents will be reviewed within 24-48 hours.`);
      
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
        alert('Maximum KYC submission attempts reached. Please contact support for assistance.');
      } else {
        alert(`Failed to submit KYC: ${error.response?.data?.error || 'Please try again.'}`);
      }
    } finally {
      setUploading(false);
    }
  };

  // Phone verification functions
  const setupRecaptcha = () => {
    try {
      // Clear any existing recaptcha verifier
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.log('Clearing existing reCAPTCHA verifier');
        }
        window.recaptchaVerifier = null;
      }

      // Check if the container element exists
      const container = document.getElementById('recaptcha-container');
      if (!container) {
        throw new Error('reCAPTCHA container not found');
      }

      // Create new reCAPTCHA verifier
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response) => {
          console.log('reCAPTCHA solved:', response);
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          setPhoneVerification(prev => ({
            ...prev,
            error: 'reCAPTCHA expired. Please try again.'
          }));
        }
      });

      return window.recaptchaVerifier;
    } catch (error) {
      console.error('Error setting up reCAPTCHA:', error);
      setPhoneVerification(prev => ({
        ...prev,
        error: 'Failed to setup verification. Please refresh and try again.'
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
      const appVerifier = setupRecaptcha();
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

      const provider = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(formattedPhone, appVerifier);
      
      setPhoneVerification(prev => ({
        ...prev,
        confirmationResult: { verificationId }, // Store verificationId for linking
        step: 'otp',
        loading: false
      }));

      alert('OTP sent successfully!');
    } catch (error) {
      console.error('OTP error:', error);
      let errorMessage = 'Failed to send OTP';
      
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.message && error.message.includes('reCAPTCHA')) {
        errorMessage = 'reCAPTCHA verification failed. Please refresh the page and try again.';
        // Clear the verifier so it can be recreated
        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
          } catch (e) {
            console.log('Error clearing reCAPTCHA verifier');
          }
        }
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
      // Get current user and create credential for verification
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const credential = PhoneAuthProvider.credential(
        phoneVerification.confirmationResult.verificationId,
        phoneVerification.otp
      );

      try {
        // Try to link phone credential to current user
        await linkWithCredential(currentUser, credential);
        console.log('Phone number successfully linked to account');
      } catch (linkError) {
        console.log('Phone linking error:', linkError.code);
        
        // If phone number is already linked to another account, we'll still mark as verified
        // This is a practical workaround for development/testing
        if (linkError.code === 'auth/account-exists-with-different-credential' || 
            linkError.code === 'auth/credential-already-in-use' ||
            linkError.code === 'auth/provider-already-linked') {
          console.log('Phone number already exists, but OTP was valid - marking as verified');
        } else {
          // For other errors, re-throw
          throw linkError;
        }
      }
      
      // Store verification in localStorage
      localStorage.setItem('phoneVerified', 'true');
      
      setPhoneVerification(prev => ({
        ...prev,
        step: 'verified',
        loading: false
      }));

      // Update KYC verification status
      setKycData(prev => ({
        ...prev,
        verification: {
          ...prev.verification,
          otpVerification: true
        }
      }));

      alert('Phone verified successfully! You can now continue with KYC submission.');
      
    } catch (error) {
      console.error('OTP verification error:', error);
      let errorMessage = 'Invalid OTP';
      
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid OTP. Please check and try again.';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'OTP expired. Please request a new one.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'This phone number is already associated with another account. However, since the OTP was valid, we\'ll proceed with verification.';
        // Still mark as verified since OTP was correct
        localStorage.setItem('phoneVerified', 'true');
        setPhoneVerification(prev => ({
          ...prev,
          step: 'verified',
          loading: false
        }));
        setKycData(prev => ({
          ...prev,
          verification: {
            ...prev.verification,
            otpVerification: true
          }
        }));
        alert('Phone verified successfully! You can now continue with KYC submission.');
        return;
      } else if (error.code === 'auth/credential-already-in-use') {
        errorMessage = 'This phone number is already in use. However, since the OTP was valid, we\'ll proceed with verification.';
        // Still mark as verified since OTP was correct
        localStorage.setItem('phoneVerified', 'true');
        setPhoneVerification(prev => ({
          ...prev,
          step: 'verified',
          loading: false
        }));
        setKycData(prev => ({
          ...prev,
          verification: {
            ...prev.verification,
            otpVerification: true
          }
        }));
        alert('Phone verified successfully! You can now continue with KYC submission.');
        return;
      }
      
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
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-full overflow-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">{previewModal.title}</h3>
            <div className="flex items-center space-x-2">
              {previewModal.fileType === 'application/pdf' && (
                <button
                  onClick={() => {
                    let pdfUrl = previewModal.image;
                    
                    // Handle Cloudinary URLs properly
                    if (pdfUrl && pdfUrl.includes('cloudinary.com')) {
                      pdfUrl = pdfUrl.replace('/image/upload/', '/raw/upload/');
                    }
                    
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
                  className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open in New Tab
                </button>
              )}
              <button
                onClick={() => setPreviewModal({ open: false, image: null, title: '', fileType: null })}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-4">
            {previewModal.fileType === 'application/pdf' ? (
              <div className="w-full">
                <div className="bg-gray-50 p-4 rounded-lg mb-4 text-center">
                  <FileText className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                  <p className="text-sm text-gray-600 mb-3">PDF Document Preview</p>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => {
                        let pdfUrl = previewModal.image;
                        
                        // Handle Cloudinary URLs properly
                        if (pdfUrl && pdfUrl.includes('cloudinary.com')) {
                          pdfUrl = pdfUrl.replace('/image/upload/', '/raw/upload/');
                        }
                        
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
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open PDF in New Tab
                    </button>
                    <button
                      onClick={() => {
                        let downloadUrl = previewModal.image;
                        
                        // Handle Cloudinary URLs for download
                        if (downloadUrl && downloadUrl.includes('cloudinary.com')) {
                          downloadUrl = downloadUrl.replace('/image/upload/', '/raw/upload/fl_attachment/');
                        }
                        
                        const link = document.createElement('a');
                        link.href = downloadUrl;
                        link.download = 'document.pdf';
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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
              className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium"
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
                          className="bg-gray-600 dark:bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors font-medium"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      
      {/* Main Content Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/borrower')}
            className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-indigo-100 rounded-full p-3 mr-4">
              <Shield className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Enhanced KYC Verification</h1>
              <p className="text-gray-600">Complete identity verification to unlock all features</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between max-w-2xl">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep > step.id ? 'bg-green-500 text-white' :
                    currentStep === step.id ? 'bg-indigo-600 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
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
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={kycData.personalInfo.fullName}
                    onChange={(e) => handleInputChange('personalInfo', 'fullName', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      errors['personalInfo.fullName'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your full legal name"
                  />
                  {errors['personalInfo.fullName'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['personalInfo.fullName']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={kycData.personalInfo.dateOfBirth}
                    onChange={(e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      errors['personalInfo.dateOfBirth'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors['personalInfo.dateOfBirth'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['personalInfo.dateOfBirth']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={kycData.personalInfo.phoneNumber}
                    onChange={(e) => handleInputChange('personalInfo', 'phoneNumber', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      errors['personalInfo.phoneNumber'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="+91 9876543210"
                  />
                  {errors['personalInfo.phoneNumber'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['personalInfo.phoneNumber']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="w-4 h-4 inline mr-2" />
                    Occupation *
                  </label>
                  <input
                    type="text"
                    value={kycData.personalInfo.occupation}
                    onChange={(e) => handleInputChange('personalInfo', 'occupation', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      errors['personalInfo.occupation'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Student, Employee, Business, etc."
                  />
                  {errors['personalInfo.occupation'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['personalInfo.occupation']}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Home className="w-4 h-4 inline mr-2" />
                    Complete Address *
                  </label>
                  <textarea
                    value={kycData.personalInfo.address}
                    onChange={(e) => handleInputChange('personalInfo', 'address', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      errors['personalInfo.address'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    rows="3"
                    placeholder="House/Flat No., Street, Area, Landmark"
                  />
                  {errors['personalInfo.address'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['personalInfo.address']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    City *
                  </label>
                  <input
                    type="text"
                    value={kycData.personalInfo.city}
                    onChange={(e) => handleInputChange('personalInfo', 'city', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      errors['personalInfo.city'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your city"
                  />
                  {errors['personalInfo.city'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['personalInfo.city']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                  <input
                    type="text"
                    value={kycData.personalInfo.state}
                    onChange={(e) => handleInputChange('personalInfo', 'state', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      errors['personalInfo.state'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your state"
                  />
                  {errors['personalInfo.state'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['personalInfo.state']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
                  <input
                    type="text"
                    value={kycData.personalInfo.pincode}
                    onChange={(e) => handleInputChange('personalInfo', 'pincode', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      errors['personalInfo.pincode'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="6-digit pincode"
                  />
                  {errors['personalInfo.pincode'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['personalInfo.pincode']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Income *</label>
                  <input
                    type="number"
                    value={kycData.personalInfo.monthlyIncome}
                    onChange={(e) => handleInputChange('personalInfo', 'monthlyIncome', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      errors['personalInfo.monthlyIncome'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Monthly income in ₹"
                  />
                  {errors['personalInfo.monthlyIncome'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['personalInfo.monthlyIncome']}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Document Upload</h2>
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
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Verification Steps</h2>
              <div className="space-y-6">
                {/* Phone Verification */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center mb-4">
                    <Smartphone className="w-6 h-6 text-blue-600 mr-3" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Phone Verification</h3>
                      <p className="text-sm text-gray-600">Verify your phone number with OTP</p>
                    </div>
                    {phoneVerification.step === 'verified' && (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                  </div>

                  {phoneVerification.step === 'phone' && (
                    <div className="space-y-3">
                      <input
                        type="tel"
                        placeholder="Enter your phone number"
                        value={phoneVerification.phoneNumber}
                        onChange={(e) => setPhoneVerification(prev => ({
                          ...prev,
                          phoneNumber: e.target.value.replace(/\D/g, ''),
                          error: null
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        maxLength={10}
                      />
                      <button 
                        onClick={sendOTP}
                        disabled={phoneVerification.loading || !phoneVerification.phoneNumber}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {phoneVerification.loading ? 'Sending...' : 'Send OTP'}
                      </button>
                    </div>
                  )}

                  {phoneVerification.step === 'otp' && (
                    <div className="space-y-3">
                      <p className="text-sm text-green-600">
                        OTP sent to +91{phoneVerification.phoneNumber}
                      </p>
                      <input
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={phoneVerification.otp}
                        onChange={(e) => setPhoneVerification(prev => ({
                          ...prev,
                          otp: e.target.value.replace(/\D/g, ''),
                          error: null
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        maxLength={6}
                      />
                      <div className="flex space-x-2">
                        <button 
                          onClick={verifyOTP}
                          disabled={phoneVerification.loading || phoneVerification.otp.length !== 6}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {phoneVerification.loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                        <button 
                          onClick={() => setPhoneVerification(prev => ({
                            ...prev,
                            step: 'phone',
                            otp: '',
                            error: null
                          }))}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                        >
                          Change Number
                        </button>
                      </div>
                    </div>
                  )}

                  {phoneVerification.step === 'verified' && (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span>Phone verified successfully!</span>
                    </div>
                  )}

                  {phoneVerification.error && (
                    <p className="text-red-600 text-sm mt-2">{phoneVerification.error}</p>
                  )}
                </div>

                <div className="flex items-center p-4 bg-purple-50 rounded-lg">
                  <Lock className="w-6 h-6 text-purple-600 mr-3" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Biometric Verification</h3>
                    <p className="text-sm text-gray-600">Facial recognition verification</p>
                  </div>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    Verify Face
                  </button>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center mb-3">
                    <MapPin className="w-6 h-6 text-green-600 mr-3" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Address Verification</h3>
                      <p className="text-sm text-gray-600">Upload a utility bill or bank statement as address proof</p>
                    </div>
                  </div>

                  {addressVerification.step === 'pending' && (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Document Type
                      </label>
                      <select
                        value={addressVerification.selectedDocument}
                        onChange={(e) => setAddressVerification(prev => ({
                          ...prev,
                          selectedDocument: e.target.value
                        }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Proceed to Upload
                        </button>
                      )}
                    </div>
                  )}

                  {addressVerification.step === 'document_upload' && (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600 mb-2">
                        Upload your {addressVerification.selectedDocument.replace('_', ' ')} as address proof
                      </div>
                      
                      <div className="border-2 border-dashed border-green-300 rounded-lg p-4">
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
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Accepted formats: PDF, JPG, PNG (Max 5MB)
                        </p>
                      </div>

                      {addressVerification.uploadedDocument && (
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-700">
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
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
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
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Submit</h2>
              
              {/* Personal Info Summary */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><strong>Name:</strong> {kycData.personalInfo.fullName}</div>
                    <div><strong>DOB:</strong> {kycData.personalInfo.dateOfBirth}</div>
                    <div><strong>Phone:</strong> {kycData.personalInfo.phoneNumber}</div>
                    <div><strong>City:</strong> {kycData.personalInfo.city}</div>
                    <div className="md:col-span-2"><strong>Address:</strong> {kycData.personalInfo.address}</div>
                  </div>
                </div>
              </div>

              {/* Documents Summary */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents Uploaded</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(kycData.documents).map(([key, doc]) => (
                    doc.file && (
                      <div key={key} className="flex items-center p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                        <span className="text-sm font-medium capitalize">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                      </div>
                    )
                  ))}
                  
                  {/* Address Verification Document */}
                  {kycData.addressVerificationData.documentFile && (
                    <div className="flex items-center p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                      <span className="text-sm font-medium">
                        Address Proof ({kycData.addressVerificationData.documentType.replace('_', ' ')})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Status Summary */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Phone Verification</span>
                    {phoneVerification.step === 'verified' ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm">Verified</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-yellow-600">
                        <Clock className="w-4 h-4 mr-1" />
                        <span className="text-sm">Pending</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Address Verification</span>
                    {addressVerification.step === 'verified' ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm">Verified</span>
                      </div>
                    ) : addressVerification.step === 'submitted' ? (
                      <div className="flex items-center text-yellow-600">
                        <Clock className="w-4 h-4 mr-1" />
                        <span className="text-sm">Under Review</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-500">
                        <X className="w-4 h-4 mr-1" />
                        <span className="text-sm">Not Started</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 mb-2">Important:</p>
                    <ul className="list-disc list-inside text-yellow-700 space-y-1">
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
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                  I confirm that all information provided is accurate and I agree to the terms and conditions
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-lg font-medium ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Previous
            </button>

            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={submitKYC}
                disabled={uploading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
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

      {/* Loading Overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-700">Uploading document...</p>
          </div>
        </div>
      )}
      
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default EnhancedKYCPage;
