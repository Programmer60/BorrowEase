import { useEffect, useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const res = await API.get("/users/me");
      if (res.data.role !== "admin") {
        alert("Access denied. Admins only.");
        navigate("/");
        return;
      }
      setIsAuthorized(true);
      loadUsers();
    } catch (error) {
      console.error("Error checking admin role:", error.message);
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await API.get("/users/all");
      setUsers(res.data);
    } catch (error) {
      console.error("Error loading users:", error.message);
      alert("Error loading users. Please try again.");
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await API.patch(`/users/${userId}/role`, { role: newRole });
      alert("Role updated successfully!");
      loadUsers();
    } catch (error) {
      console.error("Error updating role:", error.message);
      alert("Error updating role. Please try again.");
    }
  };

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!isAuthorized) return null;

  return (
    <>
      <Navbar />
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Admin - Manage Users</h1>

        <table className="table-auto w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="text-center">
                <td className="px-4 py-2">{user.name}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">{user.role}</td>
                <td className="px-4 py-2">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                    className="p-1 border rounded"
                  >
                    <option value="borrower">Borrower</option>
                    <option value="lender">Lender</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}