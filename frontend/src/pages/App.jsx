import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth.js";
import LoginPage from "./LoginPage.jsx";
import DashboardPage from "./DashboardPage.jsx";

export default function App() {
  const { user, loading, logout } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return user ? (
    <DashboardPage
      user={user}
      onLogout={() => {
        logout();
        setRefreshTrigger((prev) => prev + 1);
      }}
    />
  ) : (
    <LoginPage
      onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
    />
  );
}