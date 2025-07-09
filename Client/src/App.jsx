import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Components/Home";
import Login from "./Components/Login";
import BorrowerDashboard from "./Components/BorrowerDashBoard";
import LenderDashboard from "./Components/LenderDashboard";
import BorrowerHistory from "./Components/BorrowerHistory";
import LenderHistory from "./Components/LenderHistory";
import RoleSetup from "./Components/RoleSetup";
import AdminUsers from "./Components/AdminUsers";
import ProtectedRoute from "./Components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/borrower" element={<ProtectedRoute element={BorrowerDashboard} requiredRole="borrower" />} />
        <Route path="/lender" element={<ProtectedRoute element={LenderDashboard} requiredRole="lender" />} />
        <Route path="/borrower-history" element={<ProtectedRoute element={BorrowerHistory} requiredRole="borrower" />} />
        <Route path="/lender-history" element={<ProtectedRoute element={LenderHistory} requiredRole="lender" />} />
        <Route path="/role-setup" element={<RoleSetup />} />
        <Route path="/admin/users" element={<ProtectedRoute element={AdminUsers} requiredRole="admin" />} />
      </Routes>
    </Router>
  );
}

export default App;
// This is the main application file that sets up the routes for the BorrowEase application.