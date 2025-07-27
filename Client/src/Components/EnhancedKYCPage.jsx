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
import { onAuthStateChanged } from 'firebase/auth';


const EnhancedKYCPage = () => {
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
    }
  });
  const [uploading, setUploading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [errors, setErrors] = useState({});
  const [previewModal, setPreviewModal] = useState({ open: false, image: null, title: '', fileType: null });

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

    // Validate file size based on document type
    const sizeValidation = {
      aadharCard: { min: 100 * 1024, max: 2 * 1024 * 1024 }, // 100KB - 2MB
      panCard: { min: 100 * 1024, max: 2 * 1024 * 1024 },    // 100KB - 2MB
      selfie: { min: 50 * 1024, max: 3 * 1024 * 1024 },      // 50KB - 3MB
      bankStatement: { min: 200 * 1024, max: 5 * 1024 * 1024 }, // 200KB - 5MB
      salarySlip: { min: 100 * 1024, max: 3 * 1024 * 1024 }   // 100KB - 3MB
    };

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const validation = sizeValidation[documentType];
    
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        [`documents.${documentType}`]: 'Only JPEG, PNG, and PDF files are allowed'
      }));
      return;
    }

    // Check file size range
    if (file.size < validation.min) {
      setErrors(prev => ({
        ...prev,
        [`documents.${documentType}`]: `File too small. Minimum size: ${Math.round(validation.min / 1024)}KB for clear visibility`
      }));
      return;
    }

    if (file.size > validation.max) {
      setErrors(prev => ({
        ...prev,
        [`documents.${documentType}`]: `File too large. Maximum size: ${Math.round(validation.max / (1024 * 1024))}MB`
      }));
      return;
    }

    // For images, validate dimensions
    if (file.type.startsWith('image/')) {
      const isValidDimensions = await validateImageDimensions(file, documentType);
      if (!isValidDimensions) {
        return; // Error already set in validateImageDimensions
      }
    }

    setUploading(true);
    try {
      // Create preview for images
      let preview = null;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      // Determine upload endpoint and resource type based on file type
      const isPDF = file.type === 'application/pdf';
      const uploadEndpoint = isPDF ? 'raw/upload' : 'image/upload';
      
      // Upload to Cloudinary using environment variables
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      
      // For PDFs, specify resource type as raw
      if (isPDF) {
        formData.append('resource_type', 'raw');
      }

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/${uploadEndpoint}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      
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
      console.error('Error uploading file:', error);
      setErrors(prev => ({
        ...prev,
        [`documents.${documentType}`]: 'Upload failed. Please try again.'
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
        break;
        
      case 2:
        const { documents } = kycData;
        if (!documents.aadharCard.file) newErrors['documents.aadharCard'] = 'Aadhar card is required';
        if (!documents.panCard.file) newErrors['documents.panCard'] = 'PAN card is required';
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
      
      // Log the current state for debugging
      console.log('Current KYC Data:', kycData);
      
      const submissionData = {
        personalInfo: kycData.personalInfo,
        documents: {
          aadharUrl: kycData.documents.aadharCard.file,
          aadharNumber: kycData.documents.aadharCard.number,
          panUrl: kycData.documents.panCard.file,
          panNumber: kycData.documents.panCard.number,
          bankStatementUrl: kycData.documents.bankStatement.file,
          salarySlipUrl: kycData.documents.salarySlip.file,
          selfieUrl: kycData.documents.selfie.file,
        }
      };

      console.log('Submitting KYC data:', submissionData);
      
      // Validate required fields on frontend
      if (!submissionData.documents.aadharUrl || !submissionData.documents.panUrl || !submissionData.documents.selfieUrl) {
        alert('Please upload all required documents (Aadhar Card, PAN Card, and Selfie)');
        return;
      }
      
      const response = await API.post('/users/kyc', submissionData);
      console.log('KYC submission response:', response.data);
      
      if (response.data.user) {
        setUser(response.data.user);
      }
      
      // Show success message
      alert('KYC submitted successfully! Your documents will be reviewed within 24-48 hours.');
      
    } catch (error) {
      console.error('Error submitting KYC:', error);
      console.error('Error details:', error.response?.data);
      alert(`Failed to submit KYC: ${error.response?.data?.error || 'Please try again.'}`);
    } finally {
      setUploading(false);
    }
  };

  const DocumentUploadCard = ({ type, title, description, icon: Icon, required = true }) => {
    const doc = kycData.documents[type];
    const error = errors[`documents.${type}`];
    
    // Define requirements for each document type
    const requirements = {
      aadharCard: {
        size: '100KB - 2MB',
        resolution: 'Min: 800x500px',
        format: 'JPEG, PNG, PDF',
        tips: 'Ensure all text is clearly readable and document is well-lit'
      },
      panCard: {
        size: '100KB - 2MB',
        resolution: 'Min: 800x500px',
        format: 'JPEG, PNG, PDF',
        tips: 'Capture the entire card with good contrast and lighting'
      },
      selfie: {
        size: '50KB - 3MB',
        resolution: 'Min: 400x400px',
        format: 'JPEG, PNG',
        tips: 'Hold your Aadhar card clearly visible next to your face'
      },
      bankStatement: {
        size: '200KB - 5MB',
        resolution: 'Min: 600x800px',
        format: 'JPEG, PNG, PDF',
        tips: 'Upload last 3 months statement with all pages visible'
      },
      salarySlip: {
        size: '100KB - 3MB',
        resolution: 'Min: 600x800px',
        format: 'JPEG, PNG, PDF',
        tips: 'Ensure salary details and company letterhead are clear'
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
                      window.open(doc.file, '_blank');
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
            <input
              type="text"
              placeholder="Aadhar Number (12 digits)"
              value={doc.number || ''}
              onChange={(e) => {
                const value = e.target.value;
                setKycData(prev => ({
                  ...prev,
                  documents: {
                    ...prev.documents,
                    aadharCard: { 
                      ...(prev.documents?.aadharCard || {}), 
                      number: value 
                    }
                  }
                }));
              }}
              maxLength={12}
              className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          )}
          
          {type === 'panCard' && (
            <input
              type="text"
              placeholder="PAN Number (10 characters)"
              value={doc.number || ''}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
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
              }}
              maxLength={10}
              className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          )}
          
          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}
        </div>
      </div>
    );
  };

  const PreviewModal = () => (
    previewModal.open && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-full overflow-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">{previewModal.title}</h3>
            <div className="flex items-center space-x-2">
              {previewModal.fileType === 'application/pdf' && (
                <a
                  href={previewModal.image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open in New Tab
                </a>
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
                    <a
                      href={previewModal.image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open PDF in New Tab
                    </a>
                    <a
                      href={previewModal.image}
                      download
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Download PDF
                    </a>
                  </div>
                </div>
                <div className="w-full h-96 border rounded-lg overflow-hidden">
                  <iframe
                    src={previewModal.image}
                    className="w-full h-full"
                    title={previewModal.title}
                    onError={() => {
                      console.log('PDF iframe failed to load');
                    }}
                  />
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need to be a borrower to access KYC verification.</p>
        </div>
      </div>
    );
  }

  // Show existing KYC status if already submitted
  if (user?.kyc?.status) {
    const canResubmit = user.kyc.status === 'rejected' && user.kyc.canResubmit;
    const attemptInfo = user.kyc.submissionAttempts && user.kyc.maxAttempts ? 
      `${user.kyc.submissionAttempts}/${user.kyc.maxAttempts}` : '';

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                user.kyc.status === 'verified' ? 'bg-green-100' :
                user.kyc.status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                {user.kyc.status === 'verified' ? (
                  <CheckCircle className="w-10 h-10 text-green-600" />
                ) : user.kyc.status === 'rejected' ? (
                  <X className="w-10 h-10 text-red-600" />
                ) : (
                  <Clock className="w-10 h-10 text-yellow-600" />
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                KYC Status: {user.kyc.status.charAt(0).toUpperCase() + user.kyc.status.slice(1)}
              </h1>
              <p className="text-gray-600">
                {user.kyc.status === 'verified' && 'Your identity has been successfully verified!'}
                {user.kyc.status === 'rejected' && 'Your KYC submission needs attention.'}
                {user.kyc.status === 'pending' && 'Your documents are being reviewed.'}
              </p>
              
              {/* Show attempt information */}
              {attemptInfo && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Attempt {attemptInfo}
                  </span>
                </div>
              )}

              {/* Show rejection reason */}
              {user.kyc.reason && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Review Comments:</h3>
                  <p className="text-sm text-gray-700">{user.kyc.reason}</p>
                </div>
              )}

              {/* Show resubmission options */}
              {user.kyc.status === 'rejected' && (
                <div className="mt-6">
                  {canResubmit ? (
                    <div className="bg-blue-50 rounded-lg p-6">
                      <div className="flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-blue-600 mr-3" />
                        <h3 className="text-lg font-semibold text-blue-900">
                          Resubmission Available
                        </h3>
                      </div>
                      <p className="text-blue-700 mb-4 text-sm">
                        You can resubmit your KYC documents after addressing the issues mentioned above.
                        {attemptInfo && ` You have ${user.kyc.maxAttempts - user.kyc.submissionAttempts} attempts remaining.`}
                      </p>
                      <button
                        onClick={() => {
                          // Reset the form and allow resubmission
                          setUser(prev => ({ ...prev, kyc: null }));
                        }}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Resubmit KYC Documents
                      </button>
                    </div>
                  ) : (
                    <div className="bg-red-50 rounded-lg p-6">
                      <div className="flex items-center justify-center mb-4">
                        <X className="w-8 h-8 text-red-600 mr-3" />
                        <h3 className="text-lg font-semibold text-red-900">
                          Maximum Attempts Reached
                        </h3>
                      </div>
                      <p className="text-red-700 mb-4 text-sm">
                        You have reached the maximum number of KYC submission attempts ({user.kyc.maxAttempts || 3}). 
                        Please contact our support team for further assistance.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                          href="mailto:support@borrowease.com"
                          className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium text-center"
                        >
                          Contact Support
                        </a>
                        <button
                          onClick={() => navigate('/borrower')}
                          className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Submissions</h3>
                  <div className="space-y-3">
                    {user.kyc.previousSubmissions.map((submission, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            submission.status === 'verified' ? 'bg-green-100 text-green-800' :
                            submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            Attempt {index + 1}: {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(submission.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {submission.reason && (
                          <p className="text-sm text-gray-600">{submission.reason}</p>
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
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={kycData.personalInfo.occupation}
                    onChange={(e) => handleInputChange('personalInfo', 'occupation', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Student, Employee, etc."
                  />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Income</label>
                  <input
                    type="number"
                    value={kycData.personalInfo.monthlyIncome}
                    onChange={(e) => handleInputChange('personalInfo', 'monthlyIncome', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Monthly income in ₹"
                  />
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
                />
                <DocumentUploadCard
                  type="panCard"
                  title="PAN Card"
                  description="Upload clear image of your PAN card"
                  icon={CreditCard}
                  required
                />
                <DocumentUploadCard
                  type="selfie"
                  title="Live Selfie"
                  description="Take a clear selfie holding your Aadhar card"
                  icon={Camera}
                  required
                />
                <DocumentUploadCard
                  type="bankStatement"
                  title="Bank Statement"
                  description="Upload last 3 months bank statement (Optional)"
                  icon={FileText}
                  required={false}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Verification Steps</h2>
              <div className="space-y-6">
                <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                  <Smartphone className="w-6 h-6 text-blue-600 mr-3" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Phone Verification</h3>
                    <p className="text-sm text-gray-600">Verify your phone number with OTP</p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Send OTP
                  </button>
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

                <div className="flex items-center p-4 bg-green-50 rounded-lg">
                  <MapPin className="w-6 h-6 text-green-600 mr-3" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Address Verification</h3>
                    <p className="text-sm text-gray-600">Confirm your address details</p>
                  </div>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Verify Address
                  </button>
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
    </div>
  );
};

export default EnhancedKYCPage;
