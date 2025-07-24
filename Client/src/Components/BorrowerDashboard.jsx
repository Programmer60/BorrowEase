import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  DollarSign,
  FileText,
  Calendar,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Wallet,
  TrendingUp,
  Shield,
  Zap,
  AlertCircle,
} from "lucide-react";
import Navbar from "./Navbar";
import API from "../api/api";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";


const Toast = ({ message, type, onClose }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <AlertCircle className="w-5 h-5 text-blue-500" />,
  };

  const colors = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200",
  };

  return (
    <div
      className={`fixed top-4 right-4 ${colors[type]} border rounded-lg p-4 shadow-lg z-[100] flex items-center max-w-sm`}
    >
      {icons[type]}
      <span className="ml-3 text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-auto text-gray-400 hover:text-gray-600"
      >
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function BorrowerDashboard() {
  const [loanRequests, setLoanRequests] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    collegeEmail: "",
    phoneNumber: "",
    amount: "",
    purpose: "",
    repaymentDate: "",
  });
  const [authorized, setAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showAllLoans, setShowAllLoans] = useState(false);
  const LOANS_TO_SHOW = 4; // Show only 3 loans initially
  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFormData((prev) => ({
          ...prev,
          name: user.displayName,
          collegeEmail: user.email,
        }));

        try {
          const res = await API.get("/users/me");
          if (res.data.role === "borrower") {
            setAuthorized(true);
            loadLoans();
          } else {
            alert("Access denied. You are not a borrower.");
          }
        } catch (error) {
          alert("Failed to verify user role");
        } finally {
          setIsLoading(false);
        }
      } else {
        alert("Please log in");
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const closeToast = () => setToast(null);

  const loadLoans = async () => {
    try {
      const res = await API.get("/loans/my-loans");
      console.log("Loaded loans:", res.data);
      setLoanRequests(res.data);
    } catch (error) {
      showToast("Error fetching loans", "error");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await API.post("/loans", formData);
      showToast("Loan request submitted successfully!", "success");
      setFormData((prev) => ({
        ...prev,
        phoneNumber: "",
        amount: "",
        purpose: "",
        repaymentDate: "",
      }));
      loadLoans();
    } catch (error) {
      showToast("Error submitting loan request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async (amount, loan) => {
    try {
      const res = await API.post("/payment/create-order", { amount });
      const order = res.data;

      const options = {
        key: "rzp_test_pBgIF99r7ZIsb7",
        amount: order.amount,
        currency: order.currency,
        name: "BorrowEase",
        description: "Loan Repayment",
        order_id: order.id,
        handler: async function (response) {
        try {
          const verificationResponse = await API.post("/payment/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            loanId: loan._id,
            isRepayment: true // Explicitly mark as repayment
          });
          
          if (verificationResponse.data.status === "success") {
            showToast("Payment successful!", "success");
            await loadLoans();
          } else {
            showToast("Payment verification failed", "error");
          }
        } catch (error) {
          console.error("Payment verification failed:", error);
          showToast("Payment verification failed", "error");
        }
      },
        prefill: {
          name: auth.currentUser?.displayName,
          email: auth.currentUser?.email,
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);
        alert("Payment failed: " + response.error.description);
      });
      rzp.open();
    } catch (err) {
      console.error("Payment error", err);
      alert("Payment failed");
    }
  };
  const getStatusIcon = (loan) => {
    if (loan.repaid) return <CheckCircle className="w-5 h-5 text-green-600 z-10" />;
    if (loan.funded && loan.status === "approved") return <Clock className="w-5 h-5 text-yellow-600 z-10" />;
    if (loan.status === "approved" && !loan.funded) return <CheckCircle className="w-5 h-5 text-blue-600 z-10" />;
    if (loan.status === "rejected") return <XCircle className="w-5 h-5 text-red-600 z-10" />;
    if (loan.status === "pending") return <Clock className="w-5 h-5 text-orange-600 z-10" />;
    return <XCircle className="w-5 h-5 text-gray-600 z-10" />;
  };

  const getStatusText = (loan) => {
    if (loan.repaid) return "Repaid";
    if (loan.funded && loan.status === "approved") return "Funded, Pending Repayment";
    if (loan.status === "approved" && !loan.funded) return "Approved, Awaiting Lender";
    if (loan.status === "rejected") return "Rejected";
    if (loan.status === "pending") return "Pending Admin Review";
    return "Unknown Status";
  };

  const getStatusColor = (loan) => {
    if (loan.repaid) return "text-green-600 bg-green-100";
    if (loan.funded && loan.status === "approved") return "text-yellow-600 bg-yellow-100";
    if (loan.status === "approved" && !loan.funded) return "text-blue-600 bg-blue-100";
    if (loan.status === "rejected") return "text-red-600 bg-red-100";
    if (loan.status === "pending") return "text-orange-600 bg-orange-100";
    return "text-gray-600 bg-gray-100";
  };

  // Get loans to display based on showAllLoans state
  const loansToDisplay = showAllLoans ? loanRequests : loanRequests.slice(0, LOANS_TO_SHOW);
  const hasMoreLoans = loanRequests.length > LOANS_TO_SHOW;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 z-50">
      {/* Toast Notification - move this above Navbar */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={closeToast} />
      )}

      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center mb-4">
            <div className="bg-indigo-100 rounded-full p-3 mr-4">
              <User className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome back, {formData.name}!
              </h2>
              <p className="text-gray-600">
                Manage your loans and requests from your dashboard
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 mr-3" />
                <div>
                  <p className="text-green-100">Total Borrowed</p>
                  <p className="text-2xl font-bold">
                    ₹
                    {loanRequests
                      .reduce((sum, loan) => sum + loan.amount, 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center">
                <Shield className="w-8 h-8 mr-3" />
                <div>
                  <p className="text-blue-100">Active Loans</p>
                  <p className="text-2xl font-bold">
                    {
                      loanRequests.filter((loan) => loan.funded && !loan.repaid)
                        .length
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center">
                <Zap className="w-8 h-8 mr-3" />
                <div>
                  <p className="text-purple-100">Repaid Loans</p>
                  <p className="text-2xl font-bold">
                    {loanRequests.filter((loan) => loan.repaid).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Loan Request Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-6">
              <div className="bg-indigo-100 rounded-full p-3 mr-4">
                <Send className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                Request New Loan
              </h3>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Full Name
                  </label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50"
                    placeholder="Enter your full name"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    College Email
                  </label>
                  <input
                    name="collegeEmail"
                    value={formData.collegeEmail}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50"
                    placeholder="Enter your college email"
                    disabled
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number
                </label>
                <input
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-2" />
                    Amount (₹)
                  </label>
                  <input
                    name="amount"
                    type="number"
                    value={formData.amount}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter loan amount"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Repayment Date
                  </label>
                  <input
                    name="repaymentDate"
                    type="date"
                    value={formData.repaymentDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Purpose
                </label>
                <input
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Enter loan purpose"
                  required
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <Send className="w-5 h-5 mr-2" />
                )}
                {isSubmitting ? "Submitting..." : "Request Loan"}
              </button>
            </div>
          </div>

          {/* Loan Requests List */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-full p-3 mr-4">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Your Loan Requests
                  </h3>
                  <p className="text-sm text-gray-500">
                    {loanRequests.length} total requests
                  </p>
                </div>
              </div>
              {hasMoreLoans && (
                <button
                  onClick={() => setShowAllLoans(!showAllLoans)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
                >
                  {showAllLoans ? "Show Less" : `Show All (${loanRequests.length})`}
                </button>
              )}
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {loanRequests.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No loan requests yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Create your first loan request using the form on the left
                  </p>
                </div>
              ) : (
                <>
                  {loansToDisplay.map((loan) => (
                    <div
                      key={loan._id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-gradient-to-r from-white to-gray-50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          {getStatusIcon(loan)}
                          <div className="ml-3">
                            <h4 className="font-semibold text-gray-900">
                              {loan.purpose}
                            </h4>
                            <p className="text-sm text-gray-500">
                              ₹{loan.amount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            loan
                          )} bg-gray-100`}
                        >
                          {getStatusText(loan)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Due: {new Date(loan.repaymentDate).toLocaleDateString()}
                        </div>

                        {loan.funded && !loan.repaid && (
                          <button
                            onClick={() => handlePayment(loan.amount, loan)}
                            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 flex items-center"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Show More/Less Button at bottom */}
                  {hasMoreLoans && (
                    <div className="text-center pt-4 border-t border-gray-100">
                      <button
                        onClick={() => setShowAllLoans(!showAllLoans)}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        {showAllLoans ? (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4 mr-2" />
                            Show {loanRequests.length - LOANS_TO_SHOW} More
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
