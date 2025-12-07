import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const PASSWORD_RULES = [
  { label: "At least 12 characters", test: (pw) => pw.length >= 12 },
  { label: "Uppercase letter (A-Z)", test: (pw) => /[A-Z]/.test(pw) },
  { label: "Lowercase letter (a-z)", test: (pw) => /[a-z]/.test(pw) },
  { label: "Number (0-9)", test: (pw) => /[0-9]/.test(pw) },
  { label: "Special character (!@#$%^&*)", test: (pw) => /[^A-Za-z0-9]/.test(pw) }
];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const passwordStrength = PASSWORD_RULES.filter(r => r.test(formData.password)).length;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (passwordStrength < 5) {
      setError("Password doesn't meet all requirements");
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${BACKEND}/api/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      navigate("/login?message=Registration+successful");
    } catch (err) {
      setError(err?.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">PharmaTrack</h1>
          <p className="text-gray-600 text-sm">Create Account</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          className="w-full border border-gray-300 p-3 rounded mb-4"
          disabled={loading}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="w-full border border-gray-300 p-3 rounded mb-4"
          disabled={loading}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="w-full border border-gray-300 p-3 rounded mb-2"
          disabled={loading}
          required
        />

        {/* Password Strength Indicator */}
        <div className="mb-4 text-sm space-y-2">
          {PASSWORD_RULES.map((rule, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={rule.test(formData.password) ? "text-green-600" : "text-gray-400"}>
                ✓
              </span>
              <span className={rule.test(formData.password) ? "text-green-600" : "text-gray-500"}>
                {rule.label}
              </span>
            </div>
          ))}
        </div>

        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="w-full border border-gray-300 p-3 rounded mb-6"
          disabled={loading}
          required
        />

        <button
          type="submit"
          disabled={loading || passwordStrength < 5}
          className="w-full bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {loading ? "Creating account..." : "Register"}
        </button>

        <div className="mt-4 text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Sign In</Link>
        </div>
      </form>
    </div>
  );
}