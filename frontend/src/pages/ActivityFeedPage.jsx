import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import client from "../api/client.js";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function ActivityFeedPage({ selectedDept, setSelectedDept, departments }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ from: "", to: "", activityType: "" });

  useEffect(() => {
    if (!selectedDept) return;

    setLoading(true);
    const query = {
      departmentId: selectedDept,
      ...(filter.from && { from: filter.from }),
      ...(filter.to && { to: filter.to }),
      ...(filter.activityType && { type: filter.activityType }),
      limit: 100
    };

    client.get("/activities", { params: query })
      .then((res) => setActivities(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedDept, filter]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = io(BACKEND, { auth: { token }, autoConnect: false });

    socket.connect();
    if (selectedDept) {
      socket.emit("join", `department:${selectedDept}`);
    }

    socket.on("activity:created", (data) => {
      setActivities((prev) => [data, ...prev].slice(0, 100));
    });

    return () => {
      if (selectedDept) socket.emit("leave", `department:${selectedDept}`);
      socket.disconnect();
    };
  }, [selectedDept]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Activity Feed</h2>

      <div className="mb-6 p-4 bg-gray-50 rounded space-y-3">
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        >
          <option value="">Select Department</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>

        <input
          type="date"
          value={filter.from}
          onChange={(e) => setFilter({ ...filter, from: e.target.value })}
          placeholder="From date"
          className="w-full px-3 py-2 border rounded"
        />

        <input
          type="date"
          value={filter.to}
          onChange={(e) => setFilter({ ...filter, to: e.target.value })}
          placeholder="To date"
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {loading ? (
        <p className="text-gray-600">Loading activities...</p>
      ) : activities.length === 0 ? (
        <p className="text-gray-600">No activities yet</p>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity._id} className="p-4 border-l-4 border-blue-500 bg-gray-50 rounded">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{activity.activityType}</h3>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {activity.status}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                By: {activity.performedBy?.name || "Unknown"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(activity.createdAt).toLocaleString()}
              </p>
              {activity.details && (
                <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-24">
                  {JSON.stringify(activity.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}