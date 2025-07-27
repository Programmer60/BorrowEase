import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  Calculator, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Clock,
  Target
} from 'lucide-react';
import API from '../api/api';

const EnhancedLoanRequestForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    phoneNumber: '',
    amount: '',
    purpose: '',
    repaymentDate: '',
    tenureMonths: 1,
    customInterestRate: ''
  });

  const [interestPreview, setInterestPreview] = useState(null);
  const [tenureOptions, setTenureOptions] = useState([]);
  const [interestTiers, setInterestTiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Load interest tiers on component mount
  useEffect(() => {
    fetchInterestTiers();
  }, []);

  // Update tenure options when amount changes
  useEffect(() => {
    if (formData.amount && parseFloat(formData.amount) >= 100) {
      fetchTenureOptions();
    }
  }, [formData.amount]);

  // Preview interest calculation when amount or tenure changes
  useEffect(() => {
    if (formData.amount && formData.tenureMonths && parseFloat(formData.amount) >= 100) {
      previewInterestCalculation();
    }
  }, [formData.amount, formData.tenureMonths, formData.customInterestRate]);

  const fetchInterestTiers = async () => {
    try {
      const response = await API.get('/loans/interest-tiers');
      setInterestTiers(response.data.tiers);
    } catch (error) {
      console.error('Error fetching interest tiers:', error);
    }
  };

  const fetchTenureOptions = async () => {
    try {
      const response = await API.get(`/loans/tenure-options/${formData.amount}`);
      setTenureOptions(response.data.tenures);
      
      // Auto-select first available tenure if current selection is invalid
      if (response.data.tenures.length > 0) {
        const currentTenure = response.data.tenures.find(t => t.value === formData.tenureMonths);
        if (!currentTenure) {
          setFormData(prev => ({ ...prev, tenureMonths: response.data.tenures[0].value }));
        }
      }
    } catch (error) {
      console.error('Error fetching tenure options:', error);
    }
  };

  const previewInterestCalculation = async () => {
    try {
      setPreviewLoading(true);
      const response = await API.post('/loans/preview-interest', {
        amount: parseFloat(formData.amount),
        tenureMonths: formData.tenureMonths,
        interestRate: formData.customInterestRate ? parseFloat(formData.customInterestRate) : null
      });
      setInterestPreview(response.data);
      setErrors({});
    } catch (error) {
      console.error('Error previewing interest:', error);
      setInterestPreview(null);
      if (error.response?.data?.details) {
        setErrors({ calculation: error.response.data.details });
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phoneNumber.trim())) {
      newErrors.phoneNumber = 'Phone number must be 10 digits';
    }
    
    if (!formData.amount || parseFloat(formData.amount) < 100) {
      newErrors.amount = 'Minimum loan amount is ₹100';
    } else if (parseFloat(formData.amount) > 100000) {
      newErrors.amount = 'Maximum loan amount is ₹1,00,000';
    }
    
    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose is required';
    }
    
    if (!formData.repaymentDate) {
      newErrors.repaymentDate = 'Repayment date is required';
    }

    if (!interestPreview) {
      newErrors.calculation = 'Please wait for interest calculation to complete';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const loanData = {
        ...formData,
        amount: parseFloat(formData.amount),
        tenureMonths: formData.tenureMonths,
        interestRate: formData.customInterestRate ? parseFloat(formData.customInterestRate) : null
      };
      
      await onSubmit(loanData);
    } catch (error) {
      console.error('Error submitting loan:', error);
      setErrors({ submit: 'Failed to submit loan request. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const getTierInfo = (amount) => {
    if (!amount) return null;
    const amt = parseFloat(amount);
    return interestTiers.find(tier => 
      amt >= tier.minAmount && (tier.maxAmount === 'No limit' || amt <= tier.maxAmount)
    );
  };

  const currentTier = getTierInfo(formData.amount);

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <DollarSign className="w-6 h-6 mr-2" />
          Request a Loan
        </h2>
        <p className="text-blue-100 mt-1">Complete the form below to request your loan with transparent interest calculation</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form Fields */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="10-digit phone number"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.phoneNumber && (
                    <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loan Amount (₹) *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="Amount (₹)"
                    min="100"
                    max="100000"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.amount && (
                    <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
                  )}
                  {currentTier && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                      <Info className="w-4 h-4 inline mr-1" />
                      {currentTier.type === 'flat' 
                        ? `Flat fee of ₹${currentTier.flatFee} for amounts ₹${currentTier.minAmount}-₹${currentTier.maxAmount}`
                        : `${currentTier.annualRate}% annual interest for amounts above ₹${currentTier.minAmount}`
                      }
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tenure *
                  </label>
                  <select
                    name="tenureMonths"
                    value={formData.tenureMonths}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {tenureOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.days} days)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purpose *
                  </label>
                  <input
                    type="text"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    placeholder="e.g., Course Registration Fee, Exam Fee"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.purpose ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.purpose && (
                    <p className="text-red-500 text-sm mt-1">{errors.purpose}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repayment Date *
                  </label>
                  <input
                    type="date"
                    name="repaymentDate"
                    value={formData.repaymentDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.repaymentDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.repaymentDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.repaymentDate}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Interest Preview */}
          <div className="lg:border-l lg:border-gray-200 lg:pl-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              Loan Summary
            </h3>

            {previewLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                <span className="ml-2 text-gray-600">Calculating...</span>
              </div>
            ) : interestPreview ? (
              <div className="space-y-4">
                {/* Main Calculation */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">Loan Amount</p>
                      <p className="text-xl font-bold text-gray-900">₹{interestPreview.calculation.principal.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Interest</p>
                      <p className="text-xl font-bold text-blue-600">₹{interestPreview.calculation.interest.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Repayable</p>
                      <p className="text-2xl font-bold text-green-600">₹{interestPreview.calculation.totalRepayable.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Monthly EMI:</span>
                    <span className="font-semibold text-gray-900">₹{interestPreview.calculation.emi.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Tenure:</span>
                    <span className="font-semibold text-gray-900">{interestPreview.calculation.tenureMonths} months</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Calculation Method:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      interestPreview.calculation.calculationMethod === 'flat_fee'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {interestPreview.calculation.calculationMethod === 'flat_fee' ? 'Flat Fee' : 'Percentage'}
                    </span>
                  </div>
                  
                  {interestPreview.calculation.breakdown && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">Effective Rate:</span>
                      <span className="font-semibold text-gray-900">{interestPreview.calculation.breakdown.effectiveRate.toFixed(2)}%</span>
                    </div>
                  )}
                </div>

                {/* Explanation */}
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-yellow-800 font-medium">How this is calculated:</p>
                      <p className="text-sm text-yellow-700 mt-1">{interestPreview.explanation}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Enter loan amount to see calculation</p>
              </div>
            )}

            {errors.calculation && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-800 font-medium">Validation Errors:</p>
                    <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                      {errors.calculation.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          {errors.submit && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-red-700 text-sm">{errors.submit}</p>
            </div>
          )}
          
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !interestPreview || Object.keys(errors).length > 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Loan Request
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EnhancedLoanRequestForm;
