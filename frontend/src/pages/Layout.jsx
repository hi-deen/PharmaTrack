import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, Link } from "react-router-dom";
import axios from "axios";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function Layout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Fetch current user
    axios
      .get(`${BACKEND}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-900 text-white shadow-lg">
        <div className="p-6 border-b border-blue-800">
          <h1 className="text-2xl font-bold">PharmaTrack</h1>
          <p className="text-xs text-blue-300 mt-1">Lab Activity Logger</p>
        </div>

        <nav className="mt-6">
          <Link to="/" className="block px-6 py-3 hover:bg-blue-800 transition">
            📊 Dashboard
          </Link>
          <Link to="/activity/create" className="block px-6 py-3 hover:bg-blue-800 transition">
            ➕ Log Activity
          </Link>
          <Link to="/activity/history" className="block px-6 py-3 hover:bg-blue-800 transition">
            📋 Activity History
          </Link>
          <Link to="/reports" className="block px-6 py-3 hover:bg-blue-800 transition">
            📈 Reports
          </Link>

          {user?.role === "admin" && (
            <>
              <hr className="my-4 border-blue-700" />
              <div className="px-6 py-2 text-xs font-bold text-blue-300">ADMIN</div>
              <Link to="/admin/departments" className="block px-6 py-3 hover:bg-blue-800 transition">
                🏢 Departments
              </Link>
              <Link to="/admin/users" className="block px-6 py-3 hover:bg-blue-800 transition">
                👥 Users
              </Link>
            </>
          )}
        </nav>

        <div className="absolute bottom-0 w-64 p-6 border-t border-blue-800">
          <div className="text-xs text-blue-300 mb-3">
            {user?.email}
            <br />
            <span className="capitalize">{user?.role}</span>
          </div>
          <button
            onClick={logout}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}