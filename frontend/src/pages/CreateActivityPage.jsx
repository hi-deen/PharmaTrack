import React, { useState } from "react";
import client from "../api/client.js";

const ACTIVITY_TYPES = {
  "microbiology": [
    "Equipment usage",
    "Cleaning & sanitation",
    "Media preparation",
    "Water analysis",
    "Raw material test",
    "Finished product test",
    "Environmental monitoring",
    "Temperature & humidity log"
  ],
  "chemistry": [
    "Raw material analysis",
    "Finished product analysis",
    "Instrument usage",
    "Calibration log",
    "Chemical inventory",
    "pH meter calibration",
    "Sample preparation"
  ]
};

export default function CreateActivityPage({ departments }) {
  const [formData, setFormData] = useState({
    departmentId: "",
    activityType: "",
    status: "completed",
    shift: "morning",
    details: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedDept = departments.find((d) => d._id === formData.departmentId);
  const deptKey = selectedDept?.name?.toLowerCase().replace(/\s+/g, "") || "";
  const activityTypes = ACTIVITY_TYPES[deptKey] || [];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      let details = {};
      try {
        details = JSON.parse(formData.details || "{}");
      } catch {
        details = {};
      }

      await client.post("/activities", {
        ...formData,
        details
      });

      setSuccess("Activity logged successfully!");
      setFormData({
        departmentId: "",
        activityType: "",
        status: "completed",
        shift: "morning",
        details: ""
      });

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create activity");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-4">Log New Activity</h2>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-100 text-green-700 rounded mb-4">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Department *</label>
          <select
            name="departmentId"
            value={formData.departmentId}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Activity Type *</label>
          <select
            name="activityType"
            value={formData.activityType}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Activity Type</option>
            {activityTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Shift</label>
            <select
              name="shift"
              value={formData.shift}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Additional Details (JSON)</label>
          <textarea
            name="details"
            value={formData.details}
            onChange={handleChange}
            placeholder='{"key": "value"}'
            className="w-full px-3 py-2 border rounded font-mono text-sm"
            rows={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Logging Activity..." : "Log Activity"}
        </button>
      </form>
    </div>
  );
}