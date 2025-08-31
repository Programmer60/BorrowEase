import React, { useState } from 'react';
import { 
  AlertTriangle, 
  MessageCircle, 
  Send, 
  X, 
  FileText,
  DollarSign,
  Clock,
  Flag
} from 'lucide-react';
import API from '../api/api';
import { useTheme } from '../contexts/ThemeContext'; // Import the useTheme hook

const EnhancedDisputeForm = ({ loanDetails, onClose, onSubmitted }) => {
  const { isDark } = useTheme(); // Get the dark mode state
  const [formData, setFormData] = useState({
    subject: '',
    category: 'payment',
    priority: 'medium',
    message: '',
    expectedResolution: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'payment', label: 'Payment Issues', icon: DollarSign },
    { value: 'communication', label: 'Communication Problems', icon: MessageCircle },
    { value: 'fraud', label: 'Fraud/Suspicious Activity', icon: AlertTriangle },
    { value: 'technical', label: 'Technical Issues', icon: FileText },
    { value: 'other', label: 'Other', icon: Flag }
  ];

  const priorities = [
    { value: 'low', label: 'Low', light: 'text-gray-600 bg-gray-50', dark: 'text-gray-300 bg-gray-700/50' },
    { value: 'medium', label: 'Medium', light: 'text-yellow-600 bg-yellow-50', dark: 'text-yellow-400 bg-yellow-900/30' },
    { value: 'high', label: 'High', light: 'text-orange-600 bg-orange-50', dark: 'text-orange-400 bg-orange-900/30' },
    { value: 'urgent', label: 'Urgent', light: 'text-red-600 bg-red-50', dark: 'text-red-400 bg-red-900/30' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const disputeData = { ...formData, loanId: loanDetails._id };
      await API.post('/disputes', disputeData);
      onSubmitted?.();
      onClose();
    } catch (error) {
      const serverMsg = error?.response?.data?.error || error?.response?.data?.message;
      console.error('Error submitting dispute:', error?.response?.data || error?.message || error);
      alert(`Failed to submit dispute${serverMsg ? `: ${serverMsg}` : ''}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
        isDark ? 'bg-gray-800 text-gray-200' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center">
            <div className={`rounded-full p-2 mr-3 ${
              isDark ? 'bg-red-900/30' : 'bg-red-100'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                isDark ? 'text-red-400' : 'text-red-600'
              }`} />
            </div>
            <h2 className={`text-xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>Report an Issue</h2>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors ${
              isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Loan Details */}
        {loanDetails && (
          <div className={`p-6 border-b ${
            isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'
          }`}>
            <h3 className={`font-medium mb-3 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>Loan Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 text-gray-500 mr-2" />
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Amount: </span>
                <span className="font-medium ml-1">₹{loanDetails.amount?.toLocaleString()}</span>
              </div>
              <div className="flex items-center">
                <FileText className="w-4 h-4 text-gray-500 mr-2" />
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Purpose: </span>
                <span className="font-medium ml-1">{loanDetails.purpose}</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-gray-500 mr-2" />
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Due Date: </span>
                <span className="font-medium ml-1">
                  {new Date(loanDetails.repaymentDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center">
                <Flag className="w-4 h-4 text-gray-500 mr-2" />
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Status: </span>
                <span className={`font-medium ml-1 ${
                  loanDetails.repaid ? (isDark ? 'text-green-400' : 'text-green-600') : 
                  loanDetails.funded ? (isDark ? 'text-yellow-400' : 'text-yellow-600') : (isDark ? 'text-blue-400' : 'text-blue-600')
                }`}>
                  {loanDetails.repaid ? 'Repaid' : loanDetails.funded ? 'Active' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Subject */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Issue Subject *
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Brief description of the issue"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
              }`}
              required
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.subject.length}/100 characters</p>
          </div>

          {/* Category */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Issue Category *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((category) => (
                <label
                  key={category.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                    formData.category === category.value
                      ? (isDark ? 'border-blue-500 bg-blue-900/30' : 'border-blue-500 bg-blue-50')
                      : (isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400')
                  }`}
                >
                  <input type="radio" name="category" value={category.value} checked={formData.category === category.value} onChange={handleInputChange} className="sr-only" />
                  <category.icon className={`w-5 h-5 mr-3 ${formData.category === category.value ? 'text-blue-500' : 'text-gray-500'}`} />
                  <span className={`text-sm font-medium ${formData.category === category.value ? (isDark ? 'text-blue-300' : 'text-blue-900') : (isDark ? 'text-gray-300' : 'text-gray-700')}`}>
                    {category.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Priority Level *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {priorities.map((priority) => (
                <label
                  key={priority.value}
                  className={`flex items-center justify-center p-2 border rounded-lg cursor-pointer transition-all ${
                    formData.priority === priority.value ? 'border-current' : (isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400')
                  } ${isDark ? priority.dark : priority.light}`}
                >
                  <input type="radio" name="priority" value={priority.value} checked={formData.priority === priority.value} onChange={handleInputChange} className="sr-only" />
                  <span className="text-xs font-medium">{priority.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Message & Expected Resolution */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Detailed Description *
            </label>
            <textarea name="message" value={formData.message} onChange={handleInputChange} placeholder="Please provide all relevant details about the issue..." rows={5}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
              }`} required maxLength={1000} />
            <p className="text-xs text-gray-500 mt-1">{formData.message.length}/1000 characters</p>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Expected Resolution (Optional)
            </label>
            <textarea name="expectedResolution" value={formData.expectedResolution} onChange={handleInputChange} placeholder="What would you like us to do to resolve this?" rows={3}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
              }`} maxLength={500} />
            <p className="text-xs text-gray-500 mt-1">{formData.expectedResolution.length}/500 characters</p>
          </div>

          {/* Actions */}
          <div className={`flex items-center justify-end space-x-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <button type="button" onClick={onClose}
              className={`px-6 py-2 rounded-lg transition-colors ${
                isDark ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !formData.subject || !formData.message}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Dispute
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnhancedDisputeForm;