import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import { useEffect } from "react";
import API from "./api/api";
import { SocketProvider } from "./contexts/SocketContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./Components/NotificationSystem";
import Home from "./Components/Home";
import LoginEnhanced from "./Components/LoginEnhanced";
import About from "./Components/About";
import HowItWorks from "./Components/HowItWorks";
import Contact from "./Components/Contact";
import BorrowerDashboard from "./Components/BorrowerDashboard";
import LenderDashboard from "./Components/LenderDashboard";
import BorrowerHistory from "./Components/BorrowerHistory";
import LenderHistory from "./Components/LenderHistory";
import BorrowerAssessment from "./Components/BorrowerAssessment";
import RoleSetup from "./Components/RoleSetup";
import AdminUsers from "./Components/AdminUsers";
import AdminDashboard from "./Components/AdminDashboard";
import AdminLoanModeration from "./Components/AdminLoanModeration";
import AdminKYCManagement from "./Components/AdminKYCManagement";
import AdminContactManagement from "./Components/AdminContactManagement";
import DisputesManagement from "./Components/DisputesManagement";
import CreditScore from "./Components/CreditScore";
import ProtectedRoute from "./Components/ProtectedRoute";
import AuthenticatedRoute from "./Components/AuthenticatedRoute";
import ProfilePage from "./Components/ProfilePage";
import EnhancedChatRoom from "./Components/EnhancedChatRoom";
import ComprehensiveAIDashboard from "./Components/ComprehensiveAIDashboard";
import EnhancedKYCPage from "./Components/EnhancedKYCPage";
import PhoneVerificationPage from "./Components/PhoneVerificationPage";
import UserOnboarding from "./Components/UserOnboarding";
import LegalDocument from "./Components/LegalDocument";


function App() {
  useEffect(() => {
    // Initialize authentication state
    const initializeAuth = () => {
      const token = sessionStorage.getItem('token');
      if (token) {
        // Set token in API headers on app startup
        API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        console.log('🔑 Token loaded from sessionStorage on app startup');
      }
    };

    initializeAuth();
  }, []);

  return (
    <ThemeProvider>
      <NotificationProvider>
        <SocketProvider>
          <Router>
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: '#1f2937', color: '#fff' },
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
              }}
            />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<LoginEnhanced />} />
              <Route path="/verify-phone" element={<PhoneVerificationPage />} />
              <Route path="/onboarding" element={<UserOnboarding />} />
              
              {/* Legal Documents */}
              <Route path="/legal/:documentType" element={<LegalDocument />} />
              
              <Route path="/borrower" element={<ProtectedRoute element={BorrowerDashboard} requiredRole="borrower" />} />
              <Route path="/lender" element={<ProtectedRoute element={LenderDashboard} requiredRole="lender" />} />
              <Route path="/kyc" element={<ProtectedRoute element={EnhancedKYCPage} requiredRole="borrower" />} />
              <Route path="/borrower-history" element={<ProtectedRoute element={BorrowerHistory} requiredRole="borrower" />} />
              <Route path="/lender-history" element={<ProtectedRoute element={LenderHistory} requiredRole="lender" />} />
              <Route path="/borrower-assessment" element={<ProtectedRoute element={BorrowerAssessment} requiredRole="lender" />} />
              <Route path="/role-setup" element={<RoleSetup />} />
              <Route path="/admin" element={<ProtectedRoute element={AdminDashboard} requiredRole="admin" />} />
              <Route path="/admin/users" element={<ProtectedRoute element={AdminUsers} requiredRole="admin" />} />
              <Route path="/admin/loans" element={<ProtectedRoute element={AdminLoanModeration} requiredRole="admin" />} />
              <Route path="/admin/kyc" element={<ProtectedRoute element={AdminKYCManagement} requiredRole="admin" />} />
              <Route path="/admin/contact" element={<ProtectedRoute element={AdminContactManagement} requiredRole="admin" />} />
              <Route path="/admin/disputes" element={<ProtectedRoute element={DisputesManagement} requiredRole="admin" />} />
              <Route path="/ai-dashboard" element={<ProtectedRoute element={ComprehensiveAIDashboard} />} />
              <Route path="/credit-score" element={<AuthenticatedRoute><CreditScore /></AuthenticatedRoute>} />
              <Route path="/profile" element={<ProfilePage/>} />
              <Route path="/chats" element={<div className="p-8 text-center"><h2 className="text-xl">Chat List - Coming Soon</h2><p>Individual chat rooms are available via loan funding.</p></div>} />
              <Route path="/chat/:loanId" element={<ProtectedRoute element={EnhancedChatRoom} />} />
            </Routes>
          </Router>
        </SocketProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
// This is the main application file that sets up the routes for the BorrowEase application.