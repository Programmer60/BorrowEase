import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Components/Home";
import Login from "./Components/Login";
import BorrowerDashboard from "./Components/BorrowerDashBoard";
import LenderDashboard from "./Components/LenderDashboard";
import BorrowerHistory from "./Components/BorrowerHistory";
import LenderHistory from "./Components/LenderHistory";
import BorrowerAssessment from "./Components/BorrowerAssessment";
import RoleSetup from "./Components/RoleSetup";
import AdminUsers from "./Components/AdminUsers";
import AdminDashboard from "./Components/AdminDashboard";
import AdminLoanModeration from "./Components/AdminLoanModeration";
import AdminKYCManagement from "./Components/AdminKYCManagement";
import DisputesManagement from "./Components/DisputesManagement";
import CreditScore from "./Components/CreditScore";
import ProtectedRoute from "./Components/ProtectedRoute";
import AuthenticatedRoute from "./Components/AuthenticatedRoute";
import ProfilePage from "./Components/ProfilePage";
import EnhancedChatRoom from "./Components/EnhancedChatRoom";
import ComprehensiveAIDashboard from "./Components/ComprehensiveAIDashboard";
import EnhancedKYCPage from "./Components/EnhancedKYCPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
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
        <Route path="/admin/disputes" element={<ProtectedRoute element={DisputesManagement} requiredRole="admin" />} />
        <Route path="/ai-dashboard" element={<ProtectedRoute element={ComprehensiveAIDashboard} />} />
        <Route path="/credit-score" element={<AuthenticatedRoute><CreditScore /></AuthenticatedRoute>} />
        <Route path="/profile" element={<ProfilePage/>} />
        <Route path="/chat/:loanId" element={<ProtectedRoute element={EnhancedChatRoom} />} />
      </Routes>
    </Router>
  );
}

export default App;
// This is the main application file that sets up the routes for the BorrowEase application.