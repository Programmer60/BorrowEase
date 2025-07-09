import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import API from "../api/api";
import Navbar from "./Navbar";

export default function BorrowerDashboard() {
    const navigate = useNavigate();
    const [loanRequests, setLoanRequests] = useState([]);
    const [formData, setFormData] = useState({
        name: auth.currentUser?.displayName || "",
        collegeEmail: auth.currentUser?.email || "",
        phoneNumber: "",
        amount: "",
        purpose: "",
        repaymentDate: ""
    });
    const [authorized, setAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Check role effect
    useEffect(() => {
        const checkRole = async () => {
            try {
                const res = await API.get("/users/me");
                if (res.data.role !== "borrower") {
                    alert("Access denied. You are not a borrower.");
                    navigate("/");
                } else {
                    setAuthorized(true);
                }
            } catch (error) {
                console.error("Error verifying role:", error.message);
                navigate("/");
            } finally {
                setIsLoading(false);
            }
        };
        checkRole();
    }, [navigate]);

    // Load loans effect
    useEffect(() => {
        if (authorized) {
            loadLoans();
        }
    }, [authorized]);

    const loadLoans = async () => {
        try {
            const res = await API.get("/loans");
            setLoanRequests(res.data.filter(loan => loan.collegeEmail === auth.currentUser.email));
        } catch (error) {
            console.error("Error fetching loans:", error.message);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await API.post("/loans", formData);
            alert("Loan requested!");
            loadLoans();
        } catch (error) {
            alert("Error: " + error.response?.data?.error);
        }
    };

    const handleRepay = async (loanId) => {
        try {
            await API.patch(`/loans/${loanId}/repay`);
            alert("Marked as repaid!");
            loadLoans();
        } catch (error) {
            console.error("Error marking repaid:", error.message);
            alert("Failed to mark as repaid");
        }
    };

    if (isLoading) return <div>Loading...</div>;
    if (!authorized) return null;

    return (
        <>
            <Navbar />

            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">Borrower Dashboard</h1>

                <form onSubmit={handleSubmit} className="space-y-3 bg-gray-100 p-4 rounded">
                    <input name="name" onChange={handleChange} className="input bg-gray-200" />
                    <input name="collegeEmail" onChange={handleChange} className="input bg-gray-200" />
                    <input name="phoneNumber" onChange={handleChange} placeholder="Phone Number" required className="input" />
                    <input name="amount" type="number" onChange={handleChange} placeholder="Amount (₹)" required className="input" />
                    <input name="purpose" onChange={handleChange} placeholder="Purpose" required className="input" />
                    <input name="repaymentDate" type="date" onChange={handleChange} placeholder="Repayment Date" required className="input" />
                    <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Request Loan</button>
                </form>

                <h2 className="mt-6 font-semibold">Your Loan Requests:</h2>
                <ul>
                    {loanRequests.map((loan) => (
                        <li key={loan._id} className="p-2 border my-2">
                            <div>
                                {loan.purpose}: ₹{loan.amount} —{" "}
                                {loan.funded ? (
                                    <>
                                        {loan.repaid ? (
                                            <span className="text-green-600 font-bold">Repaid ✅</span>
                                        ) : (
                                            <>
                                                <span className="text-yellow-600 font-bold">Funded, Not Repaid</span>
                                                <button
                                                    onClick={() => handleRepay(loan._id)}
                                                    className="ml-3 px-3 py-1 bg-green-700 text-white rounded"
                                                >
                                                    Mark as Repaid
                                                </button>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-red-600">Not Funded</span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>

            </div>
        </>
    );
}
