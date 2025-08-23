import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Calendar, 
  MapPin, 
  User, 
  FileText, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Shield,
  Camera,
  X,
  ArrowRight,
  Info
} from 'lucide-react';
import API from '../api/api';
import { useTheme } from '../contexts/ThemeContext';

const KYCForm = ({ user, onKYCSubmitted }) => {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    dob: '',
    address: '',
    aadharFile: null,
    panFile: null
  });
  const [uploading, setUploading] = useState({
    aadhar: false,
    pan: false
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const aadharRef = useRef(null);
  const panRef = useRef(null);

  // Upload file to Cloudinary
  const uploadToCloudinary = async (file, type) => {
    setUploading(prev => ({ ...prev, [type]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'your_preset'); // You'll need to set this up
      
      const res = await fetch('https://api.cloudinary.com/v1_1/dbvse3x8p/image/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw error;
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, [type]: 'Please select an image file' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrors(prev => ({ ...prev, [type]: 'File size must be less than 5MB' }));
      return;
    }

    try {
      const url = await uploadToCloudinary(file, type);
      setFormData(prev => ({ 
        ...prev, 
        [`${type}File`]: file,
        [`${type}Url`]: url 
      }));
      setErrors(prev => ({ ...prev, [type]: null }));
    } catch (error) {
      setErrors(prev => ({ ...prev, [type]: 'Upload failed. Please try again.' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.dob) newErrors.dob = 'Date of birth is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.aadharFile) newErrors.aadhar = 'Aadhar card image is required';
    if (!formData.panFile) newErrors.pan = 'PAN card image is required';

    // Age validation
    if (formData.dob) {
      const today = new Date();
      const birthDate = new Date(formData.dob);
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        newErrors.dob = 'You must be at least 18 years old';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        dob: formData.dob,
        address: formData.address,
        aadharUrl: formData.aadharUrl,
        panUrl: formData.panUrl
      };

      const response = await API.post('/users/kyc', payload);
      onKYCSubmitted(response.data);
    } catch (error) {
      console.error('KYC submission error:', error);
      setErrors({ submit: 'Failed to submit KYC. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'Personal Details', icon: User },
    { id: 2, title: 'Document Upload', icon: FileText },
    { id: 3, title: 'Review & Submit', icon: CheckCircle }
  ];

  const FileUploadCard = ({ type, title, description, icon: Icon, file, error, uploading: isUploading }) => (
    <div className={`border-2 border-dashed rounded-xl p-6 hover:border-blue-400 transition-colors ${
      isDark ? 'border-gray-600' : 'border-gray-300'
    }`}>
      <div className="text-center">
        {file ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{file.name}</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, [`${type}File`]: null }))}
              className={`inline-flex items-center px-3 py-1 border rounded-md text-xs font-medium ${
                isDark 
                  ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' 
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              <X className="w-3 h-3 mr-1" />
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
              isDark ? 'bg-blue-900/50' : 'bg-blue-100'
            }`}>
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : (
                <Icon className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
            </div>
            <button
              type="button"
              onClick={() => type === 'aadhar' ? aadharRef.current?.click() : panRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <Camera className="w-4 h-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>
        )}
        {error && (
          <p className="text-xs text-red-600 mt-2 flex items-center justify-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            {error}
          </p>
        )}
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                isDark ? 'bg-blue-900/50' : 'bg-blue-100'
              }`}>
                <User className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Personal Information</h2>
              <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Please provide your basic details for verification</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className={`flex items-center text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.dob 
                      ? 'border-red-300' 
                      : isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                  }`}
                  max={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                />
                {errors.dob && (
                  <p className="text-sm text-red-600 mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.dob}
                  </p>
                )}
              </div>

              <div>
                <label className={`flex items-center text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <MapPin className="w-4 h-4 mr-2" />
                  Complete Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter your complete residential address"
                  rows="4"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                    errors.address 
                      ? 'border-red-300' 
                      : isDark 
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' 
                        : 'border-gray-300 bg-white placeholder-gray-500'
                  }`}
                />
                {errors.address && (
                  <p className="text-sm text-red-600 mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.address}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                isDark ? 'bg-purple-900/50' : 'bg-purple-100'
              }`}>
                <FileText className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Document Upload</h2>
              <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Upload clear images of your identity documents</p>
            </div>

            <div className={`border rounded-lg p-4 ${
              isDark 
                ? 'bg-blue-900/30 border-blue-700/50' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                  <p className="font-medium mb-1">Document Requirements:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Images should be clear and readable</li>
                    <li>File size should be less than 5MB</li>
                    <li>Supported formats: JPG, PNG, JPEG</li>
                    <li>Documents should be valid and not expired</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FileUploadCard
                type="aadhar"
                title="Aadhar Card"
                description="Upload your Aadhar card image"
                icon={CreditCard}
                file={formData.aadharFile}
                error={errors.aadhar}
                uploading={uploading.aadhar}
              />

              <FileUploadCard
                type="pan"
                title="PAN Card"
                description="Upload your PAN card image"
                icon={CreditCard}
                file={formData.panFile}
                error={errors.pan}
                uploading={uploading.pan}
              />
            </div>

            {/* Hidden file inputs */}
            <input
              ref={aadharRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'aadhar')}
              className="hidden"
            />
            <input
              ref={panRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'pan')}
              className="hidden"
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                isDark ? 'bg-green-900/50' : 'bg-green-100'
              }`}>
                <Shield className="w-10 h-10 text-green-600" />
              </div>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Review & Submit</h2>
              <p className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Please review your information before submitting</p>
            </div>

            <div className={`rounded-lg p-6 space-y-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div>
                <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Personal Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Full Name:</span>
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Date of Birth:</span>
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.dob}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Address:</span>
                    <span className={`font-medium text-right max-w-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>{formData.address}</span>
                  </div>
                </div>
              </div>

              <div className={`border-t pt-4 ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                <h3 className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Documents</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Aadhar Card:</span>
                    <span className="flex items-center text-green-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Uploaded
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>PAN Card:</span>
                    <span className="flex items-center text-green-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Uploaded
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`border rounded-lg p-4 ${
              isDark 
                ? 'bg-yellow-900/30 border-yellow-700/50' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                  <p className="font-medium mb-1">Important Notice:</p>
                  <p>Your documents will be reviewed by our team within 24-48 hours. You will be notified via email once the verification is complete.</p>
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className={`border rounded-lg p-4 ${
                isDark 
                  ? 'bg-red-900/30 border-red-700/50' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                  <p className={`text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>{errors.submit}</p>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.dob && formData.address.trim() && !errors.dob && !errors.address;
      case 2:
        return formData.aadharFile && formData.panFile && !errors.aadhar && !errors.pan;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className={`min-h-screen ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>KYC Verification</h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Complete your identity verification to unlock all features</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : isDark
                      ? 'bg-gray-700 border-gray-600 text-gray-400'
                      : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  <step.icon className="w-5 h-5" />
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id 
                      ? 'text-blue-600' 
                      : isDark ? 'text-gray-400' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-full h-0.5 mx-6 ${
                    currentStep > step.id 
                      ? 'bg-blue-600' 
                      : isDark ? 'bg-gray-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className={`rounded-2xl shadow-xl p-8 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <form onSubmit={handleSubmit}>
            {renderStepContent()}

            {/* Navigation Buttons */}
            <div className={`flex justify-between mt-8 pt-6 border-t ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className={`px-6 py-3 border rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canProceedToNextStep()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !canProceedToNextStep()}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Submit KYC
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default KYCForm;
