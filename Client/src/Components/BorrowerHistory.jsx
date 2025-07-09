import { useEffect, useState } from "react";
import { getMyLoans } from "../api/loanApi";
import Navbar from "./Navbar";

export default function BorrowerHistory() {
  const [loans, setLoans] = useState([]);

  useEffect(() => {
    const loadMyLoans = async () => {
      try {
        const myLoans = await getMyLoans();
        setLoans(myLoans);
      } catch (error) {
        console.error("Error loading my loans:", error.message);
      }
    };

    loadMyLoans();
  }, []);

  return (
    <>
      <Navbar />
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Loan Requests</h1>
      <ul>
        {loans.map((loan) => (
          <li key={loan._id} className="border p-3 mb-2">
            <div className="font-bold">{loan.purpose} — ₹{loan.amount}</div>
            <div>Status: {loan.funded ? (loan.repaid ? "Repaid ✅" : "Funded, Repayment Pending") : "Not Funded"}</div>
          </li>
        ))}
      </ul>
    </div>
    </>
  );
}
