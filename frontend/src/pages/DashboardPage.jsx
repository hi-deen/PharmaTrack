import React, { useState, useEffect } from "react";
import client from "../api/client.js";
import ActivityFeedPage from "./ActivityFeedPage.jsx";
import CreateActivityPage from "./CreateActivityPage.jsx";

export default function DashboardPage({ user, onLogout }) {
  const [currentPage, setCurrentPage] = useState("feed");
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);

  useEffect(() => {
    client.get("/departments")
      .then((res) => {
        setDepartments(res.data);
        if (res.data.length && !selectedDept) {
          setSelectedDept(res.data[0]._id);
        }
      })
      .catch((err) => console.error("Failed to fetch departments:", err));
  }, []);

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">PharmaTrack</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">👤 {user?.name}</span>
            <button onClick={onLogout} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setCurrentPage("feed")}
            className={`px-4 py-2 rounded font-semibold ${
              currentPage === "feed" ? "bg-blue-600 text-white" : "bg-white"
            }`}
          >
            Activity Feed
          </button>
          <button
            onClick={() => setCurrentPage("create")}
            className={`px-4 py-2 rounded font-semibold ${
              currentPage === "create" ? "bg-blue-600 text-white" : "bg-white"
            }`}
          >
            + Log Activity
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setCurrentPage("departments")}
                className={`px-4 py-2 rounded font-semibold ${
                  currentPage === "departments" ? "bg-blue-600 text-white" : "bg-white"
                }`}
              >
                Manage Departments
              </button>
              <button
                onClick={() => setCurrentPage("users")}
                className={`px-4 py-2 rounded font-semibold ${
                  currentPage === "users" ? "bg-blue-600 text-white" : "bg-white"
                }`}
              >
                Manage Users
              </button>
            </>
          )}
        </div>

        {currentPage === "feed" && (
          <ActivityFeedPage selectedDept={selectedDept} setSelectedDept={setSelectedDept} departments={departments} />
        )}
        {currentPage === "create" && (
          <CreateActivityPage departments={departments} />
        )}
        {currentPage === "departments" && isAdmin && (
          <DepartmentsPage departments={departments} setDepartments={setDepartments} />
        )}
        {currentPage === "users" && isAdmin && (
          <UsersPage />
        )}
      </div>
    </div>
  );
}

function DepartmentsPage({ departments, setDepartments }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await client.post("/departments", { name, description });
      setDepartments([...departments, res.data]);
      setName("");
      setDescription("");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create department");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this department?")) return;

    try {
      await client.delete(`/departments/${id}`);
      setDepartments(departments.filter((d) => d._id !== id));
    } catch (err) {
      alert("Failed to delete department");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Manage Departments</h2>

      <form onSubmit={handleCreate} className="mb-6 p-4 bg-gray-50 rounded">
        {error && <div className="text-red-600 mb-3">{error}</div>}
        <input
          type="text"
          placeholder="Department name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-2"
          required
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Add Department"}
        </button>
      </form>

      <div className="space-y-2">
        {departments.map((dept) => (
          <div key={dept._id} className="p-4 bg-gray-50 rounded flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{dept.name}</h3>
              <p className="text-sm text-gray-600">{dept.description}</p>
            </div>
            <button
              onClick={() => handleDelete(dept._id)}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersPage() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Manage Users</h2>
      <p className="text-gray-600">User management interface coming soon...</p>
    </div>
  );
}