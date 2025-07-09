import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-blue-100">
      <Navbar />
      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center py-20 px-4">
        <h2 className="text-4xl font-bold text-indigo-800 mb-4">
          Empowering Student Loans with Trust
        </h2>
        <p className="text-gray-700 max-w-xl mb-8">
          BorrowEase connects college borrowers and trusted lenders directly, enabling quick, transparent, and lower-interest student loans.
        </p>
        <Link
          to="/login"
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-lg hover:bg-indigo-700"
        >
          Get Started
        </Link>
      </main>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6 p-10 bg-white">
        <div className="p-6 rounded shadow text-center">
          <h3 className="text-xl font-bold mb-2">Lower Interest Rates</h3>
          <p className="text-gray-600">
            Borrow directly from peers at much lower interest rates than banks and NBFCs.
          </p>
        </div>
        <div className="p-6 rounded shadow text-center">
          <h3 className="text-xl font-bold mb-2">Faster Approval</h3>
          <p className="text-gray-600">
            Get loans quickly without paperwork delays or rigid credit checks.
          </p>
        </div>
        <div className="p-6 rounded shadow text-center">
          <h3 className="text-xl font-bold mb-2">Transparent Lending</h3>
          <p className="text-gray-600">
            See who funded your loan and track your repayment in real-time.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-gray-500 py-4">
        &copy; {new Date().getFullYear()} BorrowEase. All rights reserved.
      </footer>
    </div>
  );
}
// This is the main home page component for BorrowEase, featuring a navigation bar, hero section, and feature highlights.