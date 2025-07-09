import { auth, provider, signInWithPopup } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import API from "../api/api"; 
import Navbar from "./Navbar";

export default function Login() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const navigate = useNavigate();
    const [role, setRole] = useState("borrower");
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        if (loading) return;
        setLoading(true);

const handleLogout = () => {
    auth.signOut();
    setIsLoggedIn(false);
    navigate("/");
};

if (isLoggedIn) {
    return (
        <button
            onClick={handleLogout}
            className="w-full px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
            Logout
        </button>
    );
}

        try {
            await signInWithPopup(auth, provider);

            // Check if the user already exists
            let userRole;
            try {
                const res = await API.get("/users/me");
                userRole = res.data.role;
            } catch (err) {
                if (err.response?.status === 404) {
                    // New user → save role
                    await API.post("/users/setup", { role });
                    userRole = role;
                    console.log("User role saved:", userRole);
                } else {
                    throw err;
                }
            }

            // Redirect based on actual role from DB
            if (userRole === "borrower") {
                navigate("/borrower");
            } else if (userRole === "lender") {
                navigate("/lender");
            } else {
                alert("Invalid role detected.");
                navigate("/");
            }
        } catch (error) {
            console.error("Login failed:", error);
            alert("Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />

            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4">
                <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
                    <h1 className="text-2xl mb-6 font-bold text-center">Login</h1>
                    <div className="mb-6">
                        <label className="block mb-2 font-medium">I am a:</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            <option value="borrower">Borrower</option>
                            <option value="lender">Lender</option>
                        </select>
                    </div>
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className={`w-full px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                        {loading ? "Signing in..." : "Sign in with Google"}
                    </button>
                    <p className="mt-6 text-xs text-gray-600 text-center">
                        By signing in, you agree to our {" "}
                        <a href="/terms" className="text-blue-500 hover:underline">
                            Terms of Service
                        </a>{" "}
                        and {" "}
                        <a href="/privacy" className="text-blue-500 hover:underline">
                            Privacy Policy
                        </a>
                        .
                    </p>
                </div>
            </div>
        </>
    );
}
