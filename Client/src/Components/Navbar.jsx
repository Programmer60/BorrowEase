import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import API from "../api/api";



export default function Navbar() {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const res = await API.get("/users/me");
                    setUserRole(res.data.role);
                } catch (error) {
                    console.error("Error fetching user role:", error);
                }
            } else {
                setUserRole(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = () => {
        auth.signOut();
        navigate("/");
    };

    const handleLogoClick = () => {
        navigate("/");
    };

    

    return (
        <header className="flex justify-between items-center p-4 bg-white shadow-md">
            <h1
                className="text-2xl font-bold text-indigo-700 cursor-pointer"
                onClick={handleLogoClick}
            >
                BorrowEase
            </h1>
            <nav className="flex gap-4 items-center">
                {user && (
                    <>
                        <Link to="/borrower" className="text-indigo-600 hover:underline">
                            Borrower Dashboard
                        </Link>
                        <Link to="/lender" className="text-indigo-600 hover:underline">
                            Lender Dashboard
                        </Link>
                        <Link to="/borrower-history" className="text-indigo-600 hover:underline">
                            My Loans
                        </Link>
                        <Link to="/lender-history" className="text-indigo-600 hover:underline">
                            Funded Loans
                        </Link>
                        {userRole === "admin" && (
                            <Link to="/admin/users" className="text-red-600 hover:underline font-bold">
                                Admin Panel
                            </Link>
                        )}
                    </>
                )}
                {user ? (
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        Logout
                    </button>
                ) : (
                    <Link
                        to="/login"
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                    >
                        Login
                    </Link>
                )}
            </nav>
        </header>
    );
}