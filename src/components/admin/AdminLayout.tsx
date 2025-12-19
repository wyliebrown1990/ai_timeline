import {
  Activity,
  ChevronRight,
  ClipboardCheck,
  FileText,
  History,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Rss,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Review Queue',
    href: '/admin/review',
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    label: 'Milestones',
    href: '/admin/milestones',
    icon: <History className="h-5 w-5" />,
  },
  {
    label: 'News Sources',
    href: '/admin/sources',
    icon: <Rss className="h-5 w-5" />,
  },
  {
    label: 'Articles',
    href: '/admin/articles',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: 'API Monitoring',
    href: '/admin/api-monitoring',
    icon: <Activity className="h-5 w-5" />,
  },
];

/**
 * Generate breadcrumb items from current path
 */
function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;

    // Format label
    let label = segment.charAt(0).toUpperCase() + segment.slice(1);
    if (segment === 'new') label = 'Create New';
    if (segment === 'edit') label = 'Edit';

    breadcrumbs.push({ label, href: currentPath });
  }

  return breadcrumbs;
}

/**
 * Admin layout component with sidebar navigation and breadcrumbs
 */
export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const breadcrumbs = getBreadcrumbs(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        data-testid="admin-sidebar"
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-800">
          <Link to="/admin" className="flex items-center gap-2 text-white">
            <History className="h-6 w-6 text-blue-400" />
            <span className="font-bold text-lg">Admin</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/admin' && location.pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                    className={`
                      flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                      ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }
                    `}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section with user info and logout */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800">
          {/* User info */}
          {user && (
            <div className="px-4 py-3 border-b border-gray-800">
              <p className="text-xs text-gray-500">Logged in as</p>
              <p className="text-sm text-gray-300 font-medium">{user.sub}</p>
            </div>
          )}

          {/* Action links */}
          <div className="p-4 space-y-2">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <Home className="h-4 w-4" />
              Back to Timeline
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors w-full"
              data-testid="logout-button"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <header
          data-testid="admin-header"
          className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-6"
        >
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-600 hover:text-gray-900"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="mx-2 h-4 w-4 text-gray-400" />
                )}
                {index === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-gray-900">{crumb.label}</span>
                ) : (
                  <Link
                    to={crumb.href}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
