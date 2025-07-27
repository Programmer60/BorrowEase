import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  FileText, 
  Calendar,
  MapPin,
  User,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const KYCStatus = ({ user, onRetryKYC }) => {
  const { kyc } = user;
  
  const getStatusInfo = () => {
    switch (kyc?.status) {
      case 'verified':
        return {
          icon: CheckCircle,
          title: 'KYC Verified',
          message: 'Your identity has been successfully verified!',
          color: 'green',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-600'
        };
      case 'rejected':
        return {
          icon: XCircle,
          title: 'KYC Rejected',
          message: 'Your KYC verification was rejected. Please resubmit with correct documents.',
          color: 'red',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-600'
        };
      case 'pending':
        return {
          icon: Clock,
          title: 'KYC Under Review',
          message: 'Your documents are being reviewed. This usually takes 24-48 hours.',
          color: 'yellow',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600'
        };
      default:
        return {
          icon: AlertCircle,
          title: 'KYC Required',
          message: 'Please complete your KYC verification to access all features.',
          color: 'gray',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          iconColor: 'text-gray-600'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  if (!kyc || !kyc.status) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <Shield className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Your KYC</h2>
          <p className="text-gray-600 mb-6">
            Verify your identity to unlock all features and build trust with lenders.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-blue-50 rounded-lg">
              <User className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900">Personal Info</h3>
              <p className="text-sm text-gray-600">Provide basic details</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900">Upload Documents</h3>
              <p className="text-sm text-gray-600">Aadhar & PAN cards</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900">Get Verified</h3>
              <p className="text-sm text-gray-600">Quick review process</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className={`${statusInfo.bgColor} ${statusInfo.borderColor} border rounded-2xl shadow-lg p-8`}>
        <div className="text-center mb-6">
          <div className={`w-20 h-20 mx-auto ${statusInfo.bgColor} rounded-full flex items-center justify-center mb-4`}>
            <StatusIcon className={`w-10 h-10 ${statusInfo.iconColor}`} />
          </div>
          <h2 className={`text-2xl font-bold ${statusInfo.textColor} mb-2`}>
            {statusInfo.title}
          </h2>
          <p className={`${statusInfo.textColor} text-opacity-80`}>
            {statusInfo.message}
          </p>
        </div>

        {/* KYC Details */}
        <div className="bg-white bg-opacity-50 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Submitted Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start">
                <User className="w-5 h-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Full Name</p>
                  <p className="text-gray-900">{user.name}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Date of Birth</p>
                  <p className="text-gray-900">{kyc.dob || 'Not provided'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Address</p>
                  <p className="text-gray-900 text-sm">{kyc.address || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Document Status */}
        <div className="bg-white bg-opacity-50 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-gray-400 mr-3" />
                <span className="font-medium text-gray-700">Aadhar Card</span>
              </div>
              <span className="flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                Uploaded
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-gray-400 mr-3" />
                <span className="font-medium text-gray-700">PAN Card</span>
              </div>
              <span className="flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                Uploaded
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          {kyc.status === 'rejected' && onRetryKYC && (
            <button
              onClick={onRetryKYC}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Resubmit KYC
            </button>
          )}
          
          {kyc.status === 'pending' && (
            <div className="flex items-center justify-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              Submitted on {new Date(user.updatedAt).toLocaleDateString()}
            </div>
          )}
          
          {kyc.status === 'verified' && (
            <div className="flex items-center justify-center text-sm text-green-600">
              <CheckCircle className="w-4 h-4 mr-2" />
              Verified on {new Date(user.updatedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KYCStatus;
