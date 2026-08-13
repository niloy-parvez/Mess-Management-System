import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../context/authStore";
import { notificationService } from "../../services/notificationService";
import { LogOut, Menu, X } from "lucide-react";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    const loadUnread = async () => {
      try {
        const response = await notificationService.getUnreadCount();
        setUnreadCount(response.data?.count || 0);
      } catch {
        setUnreadCount(0);
      }
    };

    if (user?.id) {
      loadUnread();
    }
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center cursor-pointer" onClick={() => navigate("/")}>
            <div className="text-2xl font-bold text-blue-600">🍽️ Mess</div>
            <span className="ml-2 text-gray-600 hidden sm:inline">Management System</span>
          </div>

          <nav className="hidden md:flex space-x-6">
            <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">
              Dashboard
            </Link>
            <Link to="/members" className="text-gray-700 hover:text-blue-600">
              Members
            </Link>
            <Link to="/meals" className="text-gray-700 hover:text-blue-600">
              Meals
            </Link>
            <Link to="/market" className="text-gray-700 hover:text-blue-600">
              Market
            </Link>
            <Link to="/member-panel" className="text-gray-700 hover:text-blue-600">
              Member Panel
            </Link>
            <Link to="/notifications" className="text-gray-700 hover:text-blue-600 flex items-center gap-1">
              Notifications
              {unreadCount > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unreadCount}</span>}
            </Link>
            {isAdmin && (
              <>
                <Link to="/admin" className="text-gray-700 hover:text-blue-600">
                  Admin Panel
                </Link>
                <Link to="/expenses" className="text-gray-700 hover:text-blue-600">
                  Expenses
                </Link>
                <Link to="/payments" className="text-gray-700 hover:text-blue-600">
                  Payments
                </Link>
                <Link to="/reports" className="text-gray-700 hover:text-blue-600">
                  Reports
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            <span className="text-gray-700 text-sm hidden sm:inline">{user?.full_name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link to="/dashboard" className="block text-gray-700 hover:text-blue-600">
              Dashboard
            </Link>
            <Link to="/members" className="block text-gray-700 hover:text-blue-600">
              Members
            </Link>
            <Link to="/meals" className="block text-gray-700 hover:text-blue-600">
              Meals
            </Link>
            <Link to="/market" className="block text-gray-700 hover:text-blue-600">
              Market
            </Link>
            <Link to="/member-panel" className="block text-gray-700 hover:text-blue-600">
              Member Panel
            </Link>
            <Link to="/notifications" className="block text-gray-700 hover:text-blue-600 flex items-center gap-1">
              Notifications
              {unreadCount > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{unreadCount}</span>}
            </Link>
            {isAdmin && (
              <>
                <Link to="/admin" className="block text-gray-700 hover:text-blue-600">
                  Admin Panel
                </Link>
                <Link to="/expenses" className="block text-gray-700 hover:text-blue-600">
                  Expenses
                </Link>
                <Link to="/payments" className="block text-gray-700 hover:text-blue-600">
                  Payments
                </Link>
                <Link to="/reports" className="block text-gray-700 hover:text-blue-600">
                  Reports
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
