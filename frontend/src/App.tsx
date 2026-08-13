import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import MembersPage from "./pages/MembersPage";
import MemberProfilePage from "./pages/MemberProfilePage";
import MealsPage from "./pages/MealsPage";
import MarketPage from "./pages/MarketPage";
import ExpensesPage from "./pages/ExpensesPage";
import PaymentsPage from "./pages/PaymentsPage";
import ReportsPage from "./pages/ReportsPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import MemberPanelPage from "./pages/MemberPanelPage";
import NotificationsPage from "./pages/NotificationsPage";
import { useAuthStore } from "./context/authStore";

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hydrateUser = useAuthStore((state) => state.hydrateUser);

  React.useEffect(() => {
    hydrateUser();
  }, [hydrateUser]);

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        {isAuthenticated && <Header />}
        <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
            <Route path="/members/:id" element={<ProtectedRoute><MemberProfilePage /></ProtectedRoute>} />
            <Route path="/meals" element={<ProtectedRoute><MealsPage /></ProtectedRoute>} />
            <Route path="/market" element={<ProtectedRoute><MarketPage /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute adminOnly={true}><ExpensesPage /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute adminOnly={true}><PaymentsPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute adminOnly={true}><ReportsPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminPanelPage /></ProtectedRoute>} />
            <Route path="/member-panel" element={<ProtectedRoute><MemberPanelPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
          </Routes>
        </main>
        {isAuthenticated && <Footer />}
      </div>
    </BrowserRouter>
  );
}

export default App;
