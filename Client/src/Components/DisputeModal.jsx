// import React, { useState } from 'react';
// import { X, AlertTriangle, MessageCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
// import API from '../api/api';

// const DisputeModal = ({ isOpen, onClose, loanId, loanDetails }) => {
//   const [formData, setFormData] = useState({
//     category: 'other',
//     subject: '',
//     message: '',
//     priority: 'medium'
//   });
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [submitSuccess, setSubmitSuccess] = useState(false);

//   const categories = [
//     { value: 'payment', label: 'Payment Issues', icon: '💳' },
//     { value: 'communication', label: 'Communication Problems', icon: '📞' },
//     { value: 'fraud', label: 'Suspected Fraud', icon: '🚨' },
//     { value: 'technical', label: 'Technical Issues', icon: '🔧' },
//     { value: 'other', label: 'Other', icon: '❓' }
//   ];

//   const priorities = [
//     { value: 'low', label: 'Low', color: 'text-gray-600' },
//     { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
//     { value: 'high', label: 'High', color: 'text-orange-600' },
//     { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
//   ];

//   // Safe category formatting function to prevent the error you mentioned
//   const formatCategory = (category) => {
//     if (!category || typeof category !== "string") return "Unknown";
//     return category.charAt(0).toUpperCase() + category.slice(1);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setIsSubmitting(true);

//     try {
//       const response = await API.post('/disputes', {
//         loanId,
//         category: formData.category,
//         subject: formData.subject,
//         message: formData.message,
//         priority: formData.priority
//       });

//       setSubmitSuccess(true);
//       setTimeout(() => {
//         onClose();
//         setSubmitSuccess(false);
//         setFormData({
//           category: 'other',
//           subject: '',
//           message: '',
//           priority: 'medium'
//         });
//       }, 2000);

//     } catch (error) {
//       console.error('Error submitting dispute:', error);
//       alert('Failed to submit dispute. Please try again.');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const handleChange = (e) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value
//     });
//   };

//   if (!isOpen) return null;

//   if (submitSuccess) {
//     return (
//       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//         <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
//           <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
//           <h3 className="text-xl font-bold text-gray-900 mb-2">Dispute Submitted!</h3>
//           <p className="text-gray-600">
//             Your dispute has been submitted successfully. An admin will review it shortly.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
//         {/* Header */}
//         <div className="flex items-center justify-between p-6 border-b">
//           <div className="flex items-center">
//             <AlertTriangle className="w-6 h-6 text-orange-500 mr-3" />
//             <h2 className="text-xl font-bold text-gray-900">Report an Issue</h2>
//           </div>
//           <button
//             onClick={onClose}
//             className="text-gray-400 hover:text-gray-600 transition-colors"
//           >
//             <X className="w-6 h-6" />
//           </button>
//         </div>

//         {/* Loan Info */}
//         {loanDetails && (
//           <div className="p-6 bg-gray-50 border-b">
//             <h3 className="font-semibold text-gray-900 mb-2">Loan Details</h3>
//             <div className="grid grid-cols-2 gap-4 text-sm">
//               <div>
//                 <span className="text-gray-600">Amount:</span>
//                 <span className="ml-2 font-medium">₹{loanDetails.amount?.toLocaleString()}</span>
//               </div>
//               <div>
//                 <span className="text-gray-600">Purpose:</span>
//                 <span className="ml-2 font-medium">{loanDetails.purpose}</span>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Form */}
//         <form onSubmit={handleSubmit} className="p-6">
//           {/* Category Selection */}
//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 mb-3">
//               Issue Category *
//             </label>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//               {categories.map((category) => (
//                 <label
//                   key={category.value}
//                   className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
//                     formData.category === category.value
//                       ? 'border-blue-500 bg-blue-50'
//                       : 'border-gray-200 hover:bg-gray-50'
//                   }`}
//                 >
//                   <input
//                     type="radio"
//                     name="category"
//                     value={category.value}
//                     checked={formData.category === category.value}
//                     onChange={handleChange}
//                     className="sr-only"
//                   />
//                   <span className="text-xl mr-3">{category.icon}</span>
//                   <span className="text-sm font-medium">{category.label}</span>
//                 </label>
//               ))}
//             </div>
//           </div>

//           {/* Priority */}
//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Priority Level *
//             </label>
//             <select
//               name="priority"
//               value={formData.priority}
//               onChange={handleChange}
//               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//               required
//             >
//               {priorities.map((priority) => (
//                 <option key={priority.value} value={priority.value}>
//                   {priority.label}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Subject */}
//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Subject *
//             </label>
//             <input
//               type="text"
//               name="subject"
//               value={formData.subject}
//               onChange={handleChange}
//               placeholder="Brief description of the issue"
//               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//               maxLength={200}
//               required
//             />
//             <p className="text-xs text-gray-500 mt-1">
//               {formData.subject.length}/200 characters
//             </p>
//           </div>

//           {/* Message */}
//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Detailed Description *
//             </label>
//             <textarea
//               name="message"
//               value={formData.message}
//               onChange={handleChange}
//               placeholder="Please provide detailed information about the issue..."
//               rows={5}
//               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
//               maxLength={1000}
//               required
//             />
//             <p className="text-xs text-gray-500 mt-1">
//               {formData.message.length}/1000 characters
//             </p>
//           </div>

//           {/* Actions */}
//           <div className="flex justify-end space-x-3">
//             <button
//               type="button"
//               onClick={onClose}
//               className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
//               disabled={isSubmitting}
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               disabled={isSubmitting || !formData.subject || !formData.message}
//               className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
//             >
//               {isSubmitting ? (
//                 <>
//                   <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
//                   Submitting...
//                 </>
//               ) : (
//                 <>
//                   <AlertTriangle className="w-4 h-4 mr-2" />
//                   Submit Dispute
//                 </>
//               )}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default DisputeModal;
