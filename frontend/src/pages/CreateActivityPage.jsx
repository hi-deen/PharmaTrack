import React, { useState, useEffect } from "react";
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

export default function CreateActivityPage() {
  const [departments, setDepartments] = useState([]);
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
  const [deptLoading, setDeptLoading] = useState(true);

  // Fetch departments on component mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await client.get("/departments");
        setDepartments(res.data || []);
      } catch (err) {
        console.error("Failed to load departments:", err);
        setError("Failed to load departments");
      } finally {
        setDeptLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  const selectedDept = departments.find((d) => d._id === formData.departmentId);
  const deptKey = selectedDept?.name?.toLowerCase().replace(/\s+/g, "") || "";
  const activityTypes = ACTIVITY_TYPES[deptKey] || [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.departmentId) {
      setError("Please select a department");
      return;
    }

    if (!formData.activityType) {
      setError("Please select an activity type");
      return;
    }

    setLoading(true);

    try {
      let details = {};
      if (formData.details.trim()) {
        try {
          details = JSON.parse(formData.details);
        } catch {
          setError("Invalid JSON in Additional Details");
          setLoading(false);
          return;
        }
      }

      await client.post("/activities", {
        departmentId: formData.departmentId,
        activityType: formData.activityType,
        status: formData.status,
        shift: formData.shift,
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

  if (deptLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-600">Loading departments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Log New Activity</h2>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Department <span className="text-red-500">*</span>
          </label>
          <select
            name="departmentId"
            value={formData.departmentId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select a Department</option>
            {departments.length > 0 ? (
              departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))
            ) : (
              <option disabled>No departments available</option>
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Activity Type <span className="text-red-500">*</span>
          </label>
          <select
            name="activityType"
            value={formData.activityType}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={!formData.departmentId}
          >
            <option value="">Select Activity Type</option>
            {activityTypes.length > 0 ? (
              activityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))
            ) : (
              <option disabled>Select a department first</option>
            )}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Shift</label>
            <select
              name="shift"
              value={formData.shift}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Additional Details <span className="text-gray-500 font-normal">(JSON format)</span>
          </label>
          <textarea
            name="details"
            value={formData.details}
            onChange={handleChange}
            placeholder='{"temperature": 25, "notes": "example"}'
            className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={6}
          />
          <p className="text-xs text-gray-500 mt-1">Optional: Enter additional details as JSON</p>
        </div>

        <button
          type="submit"
          disabled={loading || deptLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Logging Activity..." : "Log Activity"}
        </button>
      </form>
    </div>
  );
}