import { createBrowserRouter } from "react-router-dom";
import Layout from "./pages/Layout";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CreateActivityPage from "./pages/CreateActivityPage";
import ActivityHistoryPage from "./pages/ActivityHistoryPage";
import ManageDepartmentsPage from "./pages/admin/ManageDepartmentsPage";
import ManageUsersPage from "./pages/admin/ManageUsersPage";
import ReportsPage from "./pages/ReportsPage";
import NotFoundPage from "./pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "activity/create", element: <CreateActivityPage /> },
      { path: "activity/history", element: <ActivityHistoryPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "admin/departments", element: <ManageDepartmentsPage /> },
      { path: "admin/users", element: <ManageUsersPage /> }
    ]
  },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "*", element: <NotFoundPage /> }
]);