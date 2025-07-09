import { useEffect, useState } from "react";
import { getFundedLoans } from "../api/loanApi";
import Navbar from "./Navbar";

export default function LenderHistory() {
    const [loans, setLoans] = useState([]);

    useEffect(() => {
        const loadFundedLoans = async () => {
            try {
                const fundedLoans = await getFundedLoans();
                setLoans(fundedLoans);
            } catch (error) {
                console.error("Error loading funded loans:", error.message);
            }
        };

        loadFundedLoans();
    }, []);

    return (
        <>
            <Navbar />
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">Loans You Funded</h1>
                <ul>
                    {loans.map((loan) => (
                        <li key={loan._id} className="border p-3 mb-2">
                            <div className="font-bold">{loan.purpose} — ₹{loan.amount}</div>
                            <div>Borrower: {loan.name} ({loan.collegeEmail})</div>
                            <div>Status: {loan.repaid ? "Repaid ✅" : "Repayment Pending"}</div>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );

}
