import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Star,
  AlertTriangle,
  Calculator,
  Plus,
} from "lucide-react";
import Navbar from "./Navbar";
import API from "../api/api";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import EnhancedLoanRequestForm from "./EnhancedLoanRequestForm";
import InteractiveInterestCalculator from "./InteractiveInterestCalculator";
import DisputesManagement from "./DisputesManagement";
import EnhancedDisputeForm from "./EnhancedDisputeForm";


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
  const navigate = useNavigate();
  const [loanRequests, setLoanRequests] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    collegeEmail: "",
    phoneNumber: "",
    amount: "",
    purpose: "",
    repaymentDate: "",
    tenureMonths: 1,
    customInterestRate: ""
  });
  const [authorized, setAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showAllLoans, setShowAllLoans] = useState(false);
  const [creditScore, setCreditScore] = useState(null);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeLoan, setDisputeLoan] = useState(null);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showInterestCalculator, setShowInterestCalculator] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'newLoan', 'calculator', 'disputes'
  const LOANS_TO_SHOW = 4; // Show only 4 loans initially
  

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
      
      // Fetch credit score
      try {
        const creditRes = await API.get("/credit/score");
        setCreditScore(creditRes.data);
      } catch (creditError) {
        console.log("Credit score not available");
      }
    } catch (error) {
      showToast("Error fetching loans", "error");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (loanData) => {
    setIsSubmitting(true);

    try {
      await API.post("/loans", loanData);
      showToast("Loan request submitted successfully!", "success");
      setCurrentView('dashboard');
      loadLoans();
    } catch (error) {
      showToast("Error submitting loan request", "error");
      throw error; // Re-throw to let the form handle it
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
    if (loan.status === "approved" && !loan.funded) return "Approved by Admin";
    if (loan.status === "rejected") return "Rejected by Admin";
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mt-6">
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

            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-center">
                <Clock className="w-8 h-8 mr-3" />
                <div>
                  <p className="text-orange-100">Pending Approval</p>
                  <p className="text-2xl font-bold">
                    {
                      loanRequests.filter((loan) => loan.status === 'pending').length
                    }
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

            <div 
              className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-6 text-white cursor-pointer hover:from-yellow-600 hover:to-orange-600 transition-all duration-200"
              onClick={() => navigate('/credit-score')}
            >
              <div className="flex items-center">
                <Star className="w-8 h-8 mr-3" />
                <div>
                  <p className="text-yellow-100">Credit Score</p>
                  <p className="text-2xl font-bold">
                    {creditScore ? creditScore.score : 'N/A'}
                  </p>
                  {creditScore && (
                    <p className="text-xs text-yellow-100 mt-1">
                      {creditScore.score >= 750 ? 'Excellent' : 
                       creditScore.score >= 650 ? 'Good' : 
                       creditScore.score >= 550 ? 'Fair' : 'Poor'} • Click for details
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                currentView === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <DollarSign className="w-5 h-5 mr-2" />
              Dashboard
            </button>
            
            <button
              onClick={() => setCurrentView('newLoan')}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                currentView === 'newLoan'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Plus className="w-5 h-5 mr-2" />
              Request New Loan
            </button>
            
            <button
              onClick={() => setCurrentView('calculator')}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                currentView === 'calculator'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Calculator className="w-5 h-5 mr-2" />
              Interest Calculator
            </button>
            
            <button
              onClick={() => setCurrentView('disputes')}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                currentView === 'disputes'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              Manage Disputes
            </button>
          </div>
        </div>

        {/* Conditional Content Rendering */}
        {currentView === 'newLoan' && (
          <EnhancedLoanRequestForm
            onSubmit={handleSubmit}
            onCancel={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'calculator' && (
          <InteractiveInterestCalculator />
        )}

        {currentView === 'disputes' && (
          <DisputesManagement />
        )}

        {currentView === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Actions Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center mb-6">
                <div className="bg-indigo-100 rounded-full p-3 mr-4">
                  <Zap className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Quick Actions
                </h3>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setCurrentView('newLoan')}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:from-green-100 hover:to-emerald-100 transition-all"
                >
                  <div className="flex items-center">
                    <Plus className="w-5 h-5 text-green-600 mr-3" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Request New Loan</p>
                      <p className="text-sm text-gray-600">Quick application with interest preview</p>
                    </div>
                  </div>
                  <div className="text-green-600">→</div>
                </button>

                <button
                  onClick={() => setCurrentView('calculator')}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg hover:from-purple-100 hover:to-violet-100 transition-all"
                >
                  <div className="flex items-center">
                    <Calculator className="w-5 h-5 text-purple-600 mr-3" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Interest Calculator</p>
                      <p className="text-sm text-gray-600">Explore loan scenarios and compare options</p>
                    </div>
                  </div>
                  <div className="text-purple-600">→</div>
                </button>

                <button
                  onClick={() => setCurrentView('disputes')}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg hover:from-red-100 hover:to-pink-100 transition-all"
                >
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Manage Disputes</p>
                      <p className="text-sm text-gray-600">Report issues and track resolutions</p>
                    </div>
                  </div>
                  <div className="text-red-600">→</div>
                </button>

                <button
                  onClick={() => navigate('/credit-score')}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg hover:from-yellow-100 hover:to-orange-100 transition-all"
                >
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-yellow-600 mr-3" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Check Credit Score</p>
                      <p className="text-sm text-gray-600">View detailed credit analysis</p>
                    </div>
                  </div>
                  <div className="text-yellow-600">→</div>
                </button>
              </div>
            </div>

            {/* Loan History */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-full p-3 mr-4">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Recent Loan Requests ({loanRequests.length})
                    </h3>
                  </div>
                </div>
              </div>

              {loanRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    No loans yet
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Start by requesting your first loan
                  </p>
                  <button
                    onClick={() => setCurrentView('newLoan')}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Request Loan
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {loansToDisplay.map((loan) => (
                      <div
                        key={loan._id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            {getStatusIcon(loan)}
                            <span
                              className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                                loan
                              )}`}
                            >
                              {getStatusText(loan)}
                            </span>
                          </div>
                          <span className="text-lg font-bold text-gray-900">
                            ₹{loan.amount?.toLocaleString()}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Purpose:</span>
                            <span className="font-medium text-gray-900">
                              {loan.purpose}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Phone:</span>
                            <span className="font-medium text-gray-900">
                              {loan.phoneNumber}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Repayment Date:</span>
                            <span className="font-medium text-gray-900">
                              {new Date(loan.repaymentDate).toLocaleDateString()}
                            </span>
                          </div>
                          {loan.interest && (
                            <div className="flex justify-between">
                              <span>Interest:</span>
                              <span className="font-medium text-purple-600">
                                ₹{loan.interest.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {loan.totalRepayable && (
                            <div className="flex justify-between">
                              <span>Total Repayable:</span>
                              <span className="font-medium text-green-600">
                                ₹{loan.totalRepayable.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>

                        {loan.funded && !loan.repaid && (
                          <div className="mt-4 flex space-x-2">
                            <button
                              onClick={() => handlePayment(loan.totalRepayable || loan.amount, loan)}
                              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Pay ₹{(loan.totalRepayable || loan.amount)?.toLocaleString()}
                            </button>
                            <button
                              onClick={() => {
                                setDisputeLoan(loan);
                                setShowDisputeForm(true);
                              }}
                              className="bg-red-100 text-red-700 py-2 px-4 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {hasMoreLoans && (
                    <div className="mt-6 text-center">
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
        )}
      </div>

      {/* Enhanced Dispute Form */}
      {showDisputeForm && disputeLoan && (
        <EnhancedDisputeForm
          loanDetails={disputeLoan}
          onClose={() => {
            setShowDisputeForm(false);
            setDisputeLoan(null);
          }}
          onSubmitted={() => {
            showToast('Dispute submitted successfully!', 'success');
            loadLoans(); // Refresh loans if needed
          }}
        />
      )}
    </div>
  );
}
