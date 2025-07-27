// import React, { useState, useEffect } from 'react';
// import { 
//   Shield, 
//   ArrowLeft, 
//   Upload, 
//   FileText, 
//   Camera, 
//   CheckCircle, 
//   AlertCircle, 
//   Clock,
//   User,
//   MapPin,
//   CreditCard,
//   Phone,
//   Mail,
//   Eye,
//   X
// } from 'lucide-react';
// import Navbar from './Navbar';
// import KYCForm from './KYCForm';
// import KYCStatus from './KYCStatus';
// import API from '../api/api';
// import { auth } from '../firebase';
// import { onAuthStateChanged } from 'firebase/auth';

// const KYCPage = () => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [showForm, setShowForm] = useState(false);
//   const [authorized, setAuthorized] = useState(false);

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
//       if (firebaseUser) {
//         try {
//           const res = await API.get("/users/me");
//           if (res.data.role === "borrower") {
//             setAuthorized(true);
//             setUser(res.data);
//           } else {
//             alert("Access denied. You are not a borrower.");
//           }
//         } catch (error) {
//           alert("Failed to verify user role");
//         } finally {
//           setLoading(false);
//         }
//       } else {
//         alert("Please log in");
//         setLoading(false);
//       }
//     });

//     return () => unsubscribe();
//   }, []);

//   const handleKYCSubmit = async (kycData) => {
//     try {
//       const res = await API.post("/users/kyc", kycData);
//       setUser(res.data);
//       setShowForm(false);
//       alert("KYC submitted successfully! It will be reviewed within 24-48 hours.");
//     } catch (error) {
//       console.error("Error submitting KYC:", error);
//       alert("Failed to submit KYC. Please try again.");
//     }
//   };

//   const handleRetryKYC = () => {
//     setShowForm(true);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
//           <p className="text-gray-600">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!authorized) return null;

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
//       <Navbar />
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Header */}
//         <div className="mb-8">
//           <div className="flex items-center mb-4">
//             <button 
//               onClick={() => window.history.back()}
//               className="mr-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
//             >
//               <ArrowLeft className="w-5 h-5 text-gray-600" />
//             </button>
//             <div className="flex items-center">
//               <div className="bg-indigo-100 rounded-full p-3 mr-4">
//                 <Shield className="w-8 h-8 text-indigo-600" />
//               </div>
//               <div>
//                 <h1 className="text-3xl font-bold text-gray-900">KYC Verification</h1>
//                 <p className="text-gray-600">Verify your identity to access all features</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Content */}
//         <div className="space-y-8">
//           {!user?.kyc?.status && !showForm && (
//             <div className="text-center">
//               <button
//                 onClick={() => setShowForm(true)}
//                 className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
//               >
//                 <Shield className="w-4 h-4 mr-2" />
//                 Start KYC Verification
//               </button>
//             </div>
//           )}
          
//           {showForm && (
//             <KYCForm 
//               onSubmit={handleKYCSubmit}
//               onCancel={() => setShowForm(false)}
//             />
//           )}
          
//           {user?.kyc?.status && !showForm && (
//             <KYCStatus 
//               user={user} 
//               onRetryKYC={handleRetryKYC}
//             />
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default KYCPage;
