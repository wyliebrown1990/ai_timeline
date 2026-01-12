/**
 * User Protected Route Component (Sprint LEarn-3)
 *
 * Wraps routes that require user authentication.
 * Redirects unauthenticated users to the login page.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useUserAuth } from '../../contexts';

interface UserProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected route wrapper that redirects to login if user is not authenticated
 */
export function UserProtectedRoute({ children }: UserProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useUserAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F3EF] dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E07A5F] mx-auto" />
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted URL for redirecting after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Render protected content
  return <>{children}</>;
}

export default UserProtectedRoute;
