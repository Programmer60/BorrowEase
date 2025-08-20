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
  MessageCircle,
} from "lucide-react";
import Navbar from "./Navbar";
import API from "../api/api";
import { loadChatUnreadCounts } from "../api/chatApi";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useSocket } from "../contexts/SocketContext";
import EnhancedLoanRequestForm from "./EnhancedLoanRequestForm";
import InteractiveInterestCalculator from "./InteractiveInterestCalculator";
import DisputesManagement from "./DisputesManagement";
import EnhancedDisputeForm from "./EnhancedDisputeForm";
import { ensureScrollUnlocked } from "../utils/scrollLockGuard";


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
  const [redirectingPayment, setRedirectingPayment] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState(null); // { type, message }
  const LOANS_TO_SHOW = 4; // Show only 4 loans initially

  // Use centralized socket context for chat notifications
  const { chatUnreadCounts, updateChatUnreadCounts } = useSocket();

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

    // Show payment banner if redirected back
    try {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      const status = params.get('payment');
      const reason = params.get('reason');
      if (status === 'success') {
        setPaymentBanner({ type: 'success', message: 'Payment successful. Thank you!' });
        try { localStorage.removeItem('last_order_id'); } catch {}
      } else if (status === 'failed') {
        const msg = reason ? decodeURIComponent(reason) : 'Payment failed or was cancelled.';
        setPaymentBanner({ type: 'error', message: `Payment failed: ${msg}` });
        try { localStorage.removeItem('last_order_id'); } catch {}
      }
      if (status) {
        params.delete('payment');
        params.delete('reason');
        params.delete('order');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}

    // If user closed gateway without redirect, poll last known order once
    (async () => {
      try {
        // Skip if we already handled via query param above
        const url = new URL(window.location.href);
        if (url.searchParams.get('payment')) return;
        const pendingOrderId = localStorage.getItem('last_order_id');
        if (!pendingOrderId) return;
        const { data } = await API.get(`/payment/status/${pendingOrderId}`);
        if (data?.status === 'paid') {
          setPaymentBanner({ type: 'success', message: 'Payment successful. Thank you!' });
          // Refresh loans to reflect repaid status
          try { await loadLoans(); } catch {}
        } else {
          setPaymentBanner({ type: 'error', message: 'Payment failed or was cancelled.' });
        }
      } catch (e) {
        setPaymentBanner({ type: 'error', message: 'Payment failed or was cancelled.' });
      } finally {
        try { localStorage.removeItem('last_order_id'); } catch {}
      }
    })();

    return () => {
      unsubscribe();
      // Safety: ensure body scroll isn't locked when navigating away
      ensureScrollUnlocked();
    };
  }, []);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const closeToast = () => setToast(null);

  const loadLoans = async () => {
    try {
  const res = await API.get("/loans/my-loans?limit=50");
      console.log("Loaded loans:", res.data);
      
      // Handle both old format (array) and new format (object with loans and pagination)
      const loans = res.data.loans || res.data;
      setLoanRequests(loans);
      
      // Fetch credit score
      try {
        const creditRes = await API.get("/credit/score");
        setCreditScore(creditRes.data);
      } catch (creditError) {
        console.log("Credit score not available");
      }

      // Fetch chat unread counts for funded loans (optimized bulk call)
      const fundedLoans = loans.filter(loan => loan.funded);
      if (fundedLoans.length > 0) {
        const unreadCounts = await loadChatUnreadCounts(fundedLoans);
        updateChatUnreadCounts(unreadCounts, true); // Mark as initial load
      }
    } catch (error) {
      showToast("Error fetching loans", "error");
    }
  };

  // Remove the old sequential loadChatUnreadCounts function since we're using the optimized one from chatApi

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (loanData) => {
    setIsSubmitting(true);

    try {
      const resp = await API.post("/loans", loanData);
      showToast("Loan request submitted successfully!", "success");
      setCurrentView('dashboard');
      // Optimistically add to top of list for immediate feedback
      const newLoan = resp.data?.loan || resp.data;
      if (newLoan && newLoan._id) {
        // Ensure createdAt exists so it sorts to the top immediately
        const withTimestamp = { createdAt: new Date().toISOString(), ...newLoan };
        setLoanRequests(prev => [withTimestamp, ...prev]);
      }
      // Then refresh from server in background
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
  setRedirectingPayment(true);
      // Basic validation
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        showToast("Invalid amount for payment", "error");
        return;
      }

      // Ensure Razorpay script is available
      if (typeof window === 'undefined' || !window.Razorpay) {
        showToast("Payment service not loaded. Please refresh the page.", "error");
        return;
      }

      console.log('➡️ Borrower creating order for repayment...');
      const res = await API.post("/payment/create-order", { amount: amt, loanId: loan._id, isRepayment: true }).catch(async (e) => {
        console.warn('First attempt failed (repayment), retrying...', e?.message || e);
        await new Promise(r => setTimeout(r, 300));
        return API.post("/payment/create-order", { amount: amt, loanId: loan._id, isRepayment: true });
      });
  const order = res.data;
      console.log('✅ Repayment create-order response:', order);

      if (!order || !order.id) {
        showToast("Failed to initialize payment. Try again.", "error");
        return;
      }

      const options = {
        key: "rzp_test_pBgIF99r7ZIsb7", // dev key; server validates signature
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
              isRepayment: true
            });

            if (verificationResponse.data.status === "success") {
              showToast("Payment successful!", "success");
              await loadLoans();
            } else {
              showToast("Payment verification failed", "error");
            }
          } catch (error) {
            console.error("Payment verification failed:", error);
            const msg = error?.response?.data?.error || error?.message || "Payment verification failed";
            showToast(msg, "error");
          }
        },
        prefill: {
          name: auth.currentUser?.displayName,
          email: auth.currentUser?.email,
        },
        theme: { color: "#3399cc" },
      };

      // Persist pending order so we can poll if user closes gateway without redirect
      try { localStorage.setItem('last_order_id', order.id); } catch {}

      // Prefer server-hosted checkout redirect for reliability
      try {
        const checkoutUrl = order.checkoutUrl || `${new URL(API.defaults.baseURL).origin}/api/payment/checkout/${order.id}`;
        console.log('↪️ Redirecting to repayment checkout:', checkoutUrl);
        window.location.href = checkoutUrl;
      } catch (e) {
        // Fallback to modal if URL parse fails
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (response) {
          console.error("Payment failed:", response.error);
          showToast(response?.error?.description || "Payment failed", "error");
          ensureScrollUnlocked();
        });
        console.log('🧾 Opening Razorpay modal for repayment, order_id:', order.id);
        rzp.open();
      }
      // After a short delay, ensure any scroll lock added by checkout is removed
      setTimeout(() => ensureScrollUnlocked(), 0);
    } catch (err) {
      console.error("Payment error", err);
      const msg = err?.response?.data?.error || err?.message || "Payment failed";
      showToast(msg, "error");
      ensureScrollUnlocked();
  setRedirectingPayment(false);
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

  // Order loans newest-first (by createdAt or submittedAt) and then slice for display
  const orderedLoanRequests = [...loanRequests].sort((a, b) => {
    const aDate = new Date(a.createdAt || a.updatedAt || a.fundedAt || a.submittedAt || 0).getTime();
    const bDate = new Date(b.createdAt || b.updatedAt || b.fundedAt || b.submittedAt || 0).getTime();
    return bDate - aDate; // Descending: newest first
  });

  // Get loans to display based on showAllLoans state, using the ordered list
  const loansToDisplay = showAllLoans
    ? orderedLoanRequests
    : orderedLoanRequests.slice(0, LOANS_TO_SHOW);
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
      {paymentBanner && (
        <div className={`px-4 py-3 ${paymentBanner.type === 'success' ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'} text-sm text-gray-800 flex items-center justify-between`}
             role="status">
          <span>{paymentBanner.message}</span>
          <button className="text-gray-500 hover:text-gray-700" onClick={() => setPaymentBanner(null)}>Dismiss</button>
        </div>
      )}
      {redirectingPayment && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent" />
            <span className="text-sm text-gray-700">Opening secure payment…</span>
          </div>
        </div>
      )}
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

                {/* <button
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
                </button> */}

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
                  {/* Make the loans list scrollable to avoid growing the whole page and increasing empty space */}
                  <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
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
                              onClick={() => navigate(`/chat/${loan._id}`)}
                              className="relative bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Chat
                              {chatUnreadCounts[loan._id] > 0 && (
                                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                                  {chatUnreadCounts[loan._id] > 99 ? '99+' : chatUnreadCounts[loan._id]}
                                </span>
                              )}
                            </button>
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
