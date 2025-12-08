import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import client from "../api/client.js";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function ActivityHistoryPage() {
  const [activities, setActivities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deptLoading, setDeptLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState("");
  const [filter, setFilter] = useState({ from: "", to: "", activityType: "" });

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await client.get("/departments");
        setDepartments(res.data || []);
      } catch (err) {
        console.error("Failed to load departments:", err);
        setDepartments([]);
      } finally {
        setDeptLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  // Fetch activities when department or filters change
  useEffect(() => {
    if (!selectedDept) {
      setActivities([]);
      return;
    }

    setLoading(true);
    const query = {
      departmentId: selectedDept,
      ...(filter.from && { from: filter.from }),
      ...(filter.to && { to: filter.to }),
      ...(filter.activityType && { type: filter.activityType }),
      limit: 100
    };

    client.get("/activities", { params: query })
      .then((res) => setActivities(res.data || []))
      .catch((err) => {
        console.error("Failed to load activities:", err);
        setActivities([]);
      })
      .finally(() => setLoading(false));
  }, [selectedDept, filter]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!selectedDept) return;

    const token = localStorage.getItem("token");
    const socket = io(BACKEND, { auth: { token }, autoConnect: false });

    socket.connect();
    socket.emit("join", `department:${selectedDept}`);

    socket.on("activity:created", (data) => {
      setActivities((prev) => [data, ...prev].slice(0, 100));
    });

    return () => {
      socket.emit("leave", `department:${selectedDept}`);
      socket.disconnect();
    };
  }, [selectedDept]);

  if (deptLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-600">Loading departments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Activity History</h2>

      <div className="mb-6 p-4 bg-gray-50 rounded space-y-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a Department</option>
            {departments.length > 0 ? (
              departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))
            ) : (
              <option disabled>No departments available</option>
            )}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={filter.from}
              onChange={(e) => setFilter({ ...filter, from: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={filter.to}
              onChange={(e) => setFilter({ ...filter, to: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-600">Loading activities...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No activities found. Select a department to view history.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-lg">{activity.activityType}</h3>
                  <p className="text-sm text-gray-600">
                    {activity.department?.name || "Unknown Department"}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  activity.status === "completed" ? "bg-green-100 text-green-800" :
                  activity.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                }`}>
                  {activity.status}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 mb-2">
                <p>Shift: <span className="font-medium capitalize">{activity.shift}</span></p>
                <p>Logged: {new Date(activity.createdAt).toLocaleString()}</p>
              </div>

              {activity.details && Object.keys(activity.details).length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                  <p className="font-semibold mb-1">Details:</p>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(activity.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}