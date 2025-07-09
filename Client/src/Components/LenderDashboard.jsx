import { useEffect, useState } from "react";
import { getLoanRequests, fundLoan } from "../api/loanApi";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import API from "../api/api";

export default function LenderDashboard() {
    const [loanRequests, setLoanRequests] = useState([]);
    const [authorized, setAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const loadLoans = async () => {
        try {
            const loans = await getLoanRequests();
            setLoanRequests(loans.filter((loan) => !loan.funded));
        } catch (error) {
            console.error("Error fetching loans:", error.message);
        }
    };

    useEffect(() => {
        const checkRole = async () => {
            try {
                const res = await API.get("/users/me");
                if (res.data.role !== "lender") { // Fixed: Check for lender role instead of borrower
                    alert("Access denied. You are not a lender.");
                    navigate("/");
                } else {
                    setAuthorized(true);
                }
            } catch (error) {
                console.error("Error verifying role:", error.message);
                navigate("/login");
            } finally {
                setIsLoading(false);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                navigate("/login");
            } else {
                checkRole();
                loadLoans();
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    if (isLoading) return null;
    if (!authorized) return null;





   

    const handleFund = async (loanId) => {
        try {
            const res = await fundLoan(loanId);
            const updatedLoan = res.data;

            setLoanRequests((prev) =>
                prev.map((loan) => (loan._id === updatedLoan._id ? updatedLoan : loan))
            );

            alert("Loan funded successfully!");
        } catch (error) {
            console.error("Error funding loan:", error.message);
            alert("Error funding loan: " + error.message);
        }
    };

    return (
        <>
            <Navbar />
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">Lender Dashboard</h1>
                <ul>
                    {loanRequests.map((loan) => {
                        return (
                            <li key={loan._id} className="border p-3 mb-4">
                                <div className="font-bold">{loan.purpose} — ₹{loan.amount}</div>
                                <div>By: {loan.name} ({loan.collegeEmail})</div>
                                <div>Phone: {loan.phoneNumber}</div>
                                <div>Repay by: {loan.repaymentDate}</div>
                                {loan.funded ? (
                                    <div className="text-green-600 font-bold">
                                        Funded by {loan.lenderName || "Unknown"} — {loan.repaid ? "Repaid ✅" : "Pending Repayment"}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleFund(loan._id)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded"
                                    >
                                        Fund this Loan
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </>
    );
}
