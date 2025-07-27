import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Upload,
  FileText,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import Navbar from './Navbar';
import API from '../api/api';

const AdminKYCManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [kycSubmissions, setKycSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState('');
  const [reviewComments, setReviewComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    filterSubmissions();
  }, [kycSubmissions, searchTerm, selectedStatus]);

  const checkAdminAccess = async () => {
    try {
      const res = await API.get("/users/me");
      if (res.data.role !== "admin") {
        alert("Access denied. Admins only.");
        navigate("/");
        return;
      }
      setAuthorized(true);
      loadKYCSubmissions();
    } catch (error) {
      console.error("Error checking admin role:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadKYCSubmissions = async () => {
    try {
      setLoading(true);
      const response = await API.get("/kyc/admin/all");
      setKycSubmissions(response.data);
    } catch (error) {
      console.error('Error loading KYC submissions:', error);
      alert('Failed to load KYC submissions: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const filterSubmissions = () => {
    let filtered = kycSubmissions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(submission =>
        submission.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.documents?.aadhar?.number?.includes(searchTerm) ||
        submission.documents?.pan?.number?.includes(searchTerm)
      );
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(submission => submission.status === selectedStatus);
    }

    setFilteredSubmissions(filtered);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </span>
        );
    }
  };

  const handleReviewSubmission = (submission, action) => {
    setSelectedSubmission(submission);
    setReviewAction(action);
    setReviewComments('');
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!selectedSubmission || !reviewAction) return;

    try {
      setActionLoading(true);
      
      const response = await API.put(`/kyc/${selectedSubmission._id}/review`, {
        status: reviewAction,
        comments: reviewComments
      });

      if (response.data.success) {
        // Reload KYC submissions to get updated data
        await loadKYCSubmissions();
        setShowReviewModal(false);
        setSelectedSubmission(null);
        alert(`KYC submission ${reviewAction} successfully`);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review: ' + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const resetAttempts = async (submissionId) => {
    if (!confirm('Are you sure you want to reset this user\'s KYC submission attempts? This will allow them to resubmit their documents.')) {
      return;
    }

    try {
      setActionLoading(true);
      
      const response = await API.put(`/kyc/${submissionId}/reset-attempts`);
      
      if (response.data.success) {
        await loadKYCSubmissions();
        alert('KYC submission attempts reset successfully. User can now resubmit their documents.');
      }
    } catch (error) {
      console.error('Error resetting attempts:', error);
      alert('Failed to reset attempts: ' + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddressVerificationReview = async (kycId, status) => {
    const rejectionReason = status === 'rejected' 
      ? prompt('Please provide a reason for rejection:')
      : null;

    if (status === 'rejected' && !rejectionReason) {
      return; // User cancelled
    }

    try {
      setActionLoading(true);
      
      const response = await API.post(`/kyc/admin/address-verification/${kycId}`, {
        status,
        rejectionReason
      });
      
      if (response.data.success) {
        await loadKYCSubmissions();
        alert(`Address verification ${status} successfully`);
      }
    } catch (error) {
      console.error('Error reviewing address verification:', error);
      alert('Failed to review address verification: ' + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const toggleCardExpansion = (submissionId) => {
    setExpandedCards(prev => ({
      ...prev,
      [submissionId]: !prev[submissionId]
    }));
  };

  const DocumentViewer = ({ document, title }) => {
    if (!document) return null;

    const openDocument = (url) => {
      console.log('Opening document:', url); // Debug log
      if (!url) {
        alert('Document URL is not available');
        return;
      }
      
      try {
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          alert('Pop-up blocked. Please allow pop-ups for this site and try again.');
        }
      } catch (error) {
        console.error('Error opening document:', error);
        alert('Failed to open document. Please try again.');
      }
    };

    return (
      <div className="border rounded-lg p-3 bg-gray-50">
        <h4 className="font-medium text-gray-900 mb-2">{title}</h4>
        {typeof document === 'string' ? (
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Document uploaded</span>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openDocument(document);
              }}
              className="text-blue-600 hover:text-blue-800 cursor-pointer"
              title="View document"
              type="button"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {document.number && (
              <p className="text-sm"><strong>Number:</strong> {document.number}</p>
            )}
            {document.docType && (
              <p className="text-sm"><strong>Type:</strong> {document.docType.replace('_', ' ').toUpperCase()}</p>
            )}
            <div className="flex space-x-2">
              {document.frontImage && (
                <div className="flex items-center space-x-1">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-600">Front</span>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openDocument(document.frontImage);
                    }}
                    className="text-blue-600 hover:text-blue-800 cursor-pointer"
                    title="View front image"
                    type="button"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
              {document.backImage && (
                <div className="flex items-center space-x-1">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-600">Back</span>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openDocument(document.backImage);
                    }}
                    className="text-blue-600 hover:text-blue-800 cursor-pointer"
                    title="View back image"
                    type="button"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
              {document.image && (
                <div className="flex items-center space-x-1">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-600">Image</span>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openDocument(document.image);
                    }}
                    className="text-blue-600 hover:text-blue-800 cursor-pointer"
                    title="View image"
                    type="button"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading KYC submissions...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">KYC Management</h1>
                <p className="text-gray-600">Review and verify user identity documents</p>
              </div>
            </div>
            <button
              onClick={loadKYCSubmissions}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{kycSubmissions.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kycSubmissions.filter(s => s.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kycSubmissions.filter(s => s.status === 'verified').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kycSubmissions.filter(s => s.status === 'rejected').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or document number..."
                    className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <select
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending Review</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="text-sm text-gray-600">
                Showing {filteredSubmissions.length} of {kycSubmissions.length} submissions
              </div>
            </div>
          </div>
        </div>

        {/* KYC Submissions */}
        <div className="space-y-6">
          {filteredSubmissions.map((submission) => (
            <div key={submission._id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-white font-medium text-lg">
                          {submission.userName?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{submission.userName}</h3>
                      <p className="text-sm text-gray-500">{submission.userEmail}</p>
                      <p className="text-sm text-gray-500">{submission.userPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(submission.status)}
                    <button
                      onClick={() => toggleCardExpansion(submission._id)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      {expandedCards[submission._id] ? 
                        <ChevronUp className="w-5 h-5" /> : 
                        <ChevronDown className="w-5 h-5" />
                      }
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Submitted</p>
                      <p className="text-sm font-medium">{new Date(submission.submittedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {submission.reviewedAt && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Reviewed</p>
                        <p className="text-sm font-medium">{new Date(submission.reviewedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Aadhar</p>
                      <p className="text-sm font-medium">{submission.documents?.aadhar?.number || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">PAN</p>
                      <p className="text-sm font-medium">{submission.documents?.pan?.number || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Attempts</p>
                      <p className="text-sm font-medium">
                        {submission.submissionAttempts || 1}/3
                        {submission.maxAttemptsReached && (
                          <span className="ml-1 text-red-600 font-bold">MAX</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {expandedCards[submission._id] && (
                  <div className="border-t pt-4 mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Personal Information */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Personal Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Full Name:</span>
                            <span className="font-medium">{submission.personalInfo?.fullName || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Date of Birth:</span>
                            <span className="font-medium">
                              {submission.personalInfo?.dateOfBirth ? 
                                (() => {
                                  try {
                                    return new Date(submission.personalInfo.dateOfBirth).toLocaleDateString();
                                  } catch (e) {
                                    return submission.personalInfo.dateOfBirth;
                                  }
                                })() : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Occupation:</span>
                            <span className="font-medium">{submission.personalInfo?.occupation || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Monthly Income:</span>
                            <span className="font-medium">
                              {submission.personalInfo?.monthlyIncome ? 
                                `₹${submission.personalInfo.monthlyIncome.toLocaleString()}` : 'N/A'}
                            </span>
                          </div>
                          <div className="pt-2">
                            <span className="text-gray-600">Address:</span>
                            <p className="font-medium mt-1">{submission.personalInfo?.address || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Documents */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Documents</h4>
                        <div className="space-y-3">
                          <DocumentViewer document={submission.documents?.aadhar} title="Aadhar Card" />
                          <DocumentViewer document={submission.documents?.pan} title="PAN Card" />
                          <DocumentViewer document={submission.documents?.selfie} title="Selfie" />
                          {submission.documents?.addressProof && (
                            <DocumentViewer document={submission.documents.addressProof} title="Address Proof" />
                          )}
                          {submission.documents?.incomeProof && (
                            <DocumentViewer document={submission.documents.incomeProof} title="Income Proof" />
                          )}
                        </div>
                      </div>

                      {/* Verification Status */}
                      {submission.verificationStatus && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Verification Status</h4>
                          <div className="space-y-3">
                            
                            {/* Phone Verification */}
                            {submission.verificationStatus.phoneVerification && (
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center">
                                  <Phone className="w-4 h-4 text-blue-600 mr-2" />
                                  <span className="text-sm font-medium">Phone Verification</span>
                                </div>
                                <div className="flex items-center">
                                  {submission.verificationStatus.phoneVerification.status === 'verified' ? (
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
                              </div>
                            )}

                            {/* Address Verification */}
                            {submission.verificationStatus.addressVerification && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center">
                                    <MapPin className="w-4 h-4 text-green-600 mr-2" />
                                    <span className="text-sm font-medium">Address Verification</span>
                                  </div>
                                  <div className="flex items-center">
                                    {submission.verificationStatus.addressVerification.status === 'verified' ? (
                                      <div className="flex items-center text-green-600">
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        <span className="text-sm">Verified</span>
                                      </div>
                                    ) : submission.verificationStatus.addressVerification.status === 'submitted' ? (
                                      <div className="flex items-center text-yellow-600">
                                        <Clock className="w-4 h-4 mr-1" />
                                        <span className="text-sm">Under Review</span>
                                      </div>
                                    ) : submission.verificationStatus.addressVerification.status === 'rejected' ? (
                                      <div className="flex items-center text-red-600">
                                        <XCircle className="w-4 h-4 mr-1" />
                                        <span className="text-sm">Rejected</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center text-gray-500">
                                        <Clock className="w-4 h-4 mr-1" />
                                        <span className="text-sm">Pending</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {submission.verificationStatus.addressVerification.documentType && (
                                  <p className="text-xs text-gray-600 mb-2">
                                    Document: {submission.verificationStatus.addressVerification.documentType.replace('_', ' ')}
                                  </p>
                                )}
                                
                                {submission.verificationStatus.addressVerification.status === 'submitted' && (
                                  <div className="flex space-x-2 mt-2">
                                    <button
                                      onClick={() => handleAddressVerificationReview(submission._id, 'verified')}
                                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleAddressVerificationReview(submission._id, 'rejected')}
                                      className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                                
                                {submission.verificationStatus.addressVerification.rejectionReason && (
                                  <p className="text-xs text-red-600 mt-2">
                                    Rejection Reason: {submission.verificationStatus.addressVerification.rejectionReason}
                                  </p>
                                )}
                              </div>
                            )}

                          </div>
                        </div>
                      )}
                    </div>

                    {/* Comments */}
                    {submission.comments && submission.comments.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-semibold text-gray-900 mb-3">Review Comments</h4>
                        <div className="space-y-2">
                          {submission.comments.map((commentObj, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-3">
                              {typeof commentObj === 'string' ? (
                                <p className="text-sm text-gray-700">{commentObj}</p>
                              ) : (
                                <div>
                                  <p className="text-sm text-gray-700">{commentObj.comment}</p>
                                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                                    <span>By: {commentObj.addedBy}</span>
                                    <span>
                                      {(() => {
                                        try {
                                          return new Date(commentObj.addedAt).toLocaleDateString();
                                        } catch (e) {
                                          return 'Invalid date';
                                        }
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {submission.status === 'pending' && (
                      <div className="flex space-x-3 mt-6 pt-4 border-t">
                        <button
                          onClick={() => handleReviewSubmission(submission, 'verified')}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReviewSubmission(submission, 'rejected')}
                          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Reset Attempts for rejected KYC with max attempts reached */}
                    {submission.status === 'rejected' && submission.maxAttemptsReached && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t bg-red-50 p-4 rounded-lg">
                        <div>
                          <h4 className="text-sm font-medium text-red-800">Maximum Attempts Reached</h4>
                          <p className="text-xs text-red-600">This user has exhausted all 3 submission attempts.</p>
                        </div>
                        <button
                          onClick={() => resetAttempts(submission._id)}
                          disabled={actionLoading}
                          className="flex items-center px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Reset Attempts
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!expandedCards[submission._id] && submission.status === 'pending' && (
                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={() => handleReviewSubmission(submission, 'verified')}
                      className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReviewSubmission(submission, 'rejected')}
                      className="flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Reject
                    </button>
                    <button
                      onClick={() => toggleCardExpansion(submission._id)}
                      className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredSubmissions.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No KYC submissions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && selectedSubmission && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                {reviewAction === 'verified' ? (
                  <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 mr-3" />
                )}
                <h3 className="text-lg font-semibold">
                  {reviewAction === 'verified' ? 'Approve' : 'Reject'} KYC Submission
                </h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                Are you sure you want to {reviewAction === 'verified' ? 'approve' : 'reject'} the KYC submission for {selectedSubmission.userName}?
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments {reviewAction === 'rejected' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder={reviewAction === 'verified' ? 'Optional approval comments...' : 'Required rejection reason...'}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReview}
                  disabled={actionLoading || (reviewAction === 'rejected' && !reviewComments.trim())}
                  className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                    reviewAction === 'verified'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } ${actionLoading || (reviewAction === 'rejected' && !reviewComments.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {actionLoading ? 'Processing...' : (reviewAction === 'verified' ? 'Approve' : 'Reject')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminKYCManagement;
