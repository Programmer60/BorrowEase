import { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";

export default function RoleSetup() {
  const [role, setRole] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/users/setup", { role });
      alert("Role saved!");
      navigate(role === "borrower" ? "/borrower" : "/lender");
    } catch (error) {
      console.error("Error saving role:", error.message);
      alert("Error saving role");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">Choose your role:</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          className="p-2 border rounded"
        >
          <option value="">Select Role</option>
          <option value="borrower">Borrower</option>
          <option value="lender">Lender</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
// This component allows users to select their role (borrower or lender) and saves it to the server.
// After saving, it redirects them to the appropriate dashboard based on their selected role.