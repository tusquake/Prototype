import { useLocation, createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Callback from './pages/Callback';
import Dashboard from './pages/Dashboard';
import ParentPage from './pages/ParentPage';
import Tasks from './pages/Tasks';
import Inbox from './pages/Inbox';
import Sops from './pages/Sops';
import SopInstances from './pages/SopsInstances';
import AuditLogs from './pages/AuditLogs';
import { getSession } from './auth/auth';
import { isAdmin } from './auth/rbac';
import './index.css';
import AccessControl from './pages/AccessControl';
import ProcessCategories from './pages/ProcessCategories';
import { EntityProvider } from './context/EntityContext';

/** Redirect authenticated users to their home page based on role */
function getDefaultRoute(session) {
  if (!session) return '/login';
  return isAdmin(session.user?.role) ? '/dashboard' : '/inbox';
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/** Only admins can view this route; non-admins are redirected to /inbox */
function AdminRoute({ children }) {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin(session.user?.role)) {
    return <Navigate to="/inbox" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const session = getSession();

  if (session) {
    const dest = getDefaultRoute(session);
    return <Navigate to={dest} replace />;
  }

  return children;
}


export default function App() {

  const router = createBrowserRouter([
    {
      path: "/login",
      element: (
        <PublicOnlyRoute>
          <Login />
        </PublicOnlyRoute>
      ),
    },
    {
      path: "/callback",
      element: <Callback />,
    },
    {
      element: <ParentPage />,
      children: [
        {
          path: "/dashboard",
          element: (
            <AdminRoute>
              <Dashboard />
            </AdminRoute>
          ),
        },
        {
          path: "/inbox",
          element: (
            <ProtectedRoute>
              <Inbox />
            </ProtectedRoute>
          ),
        },
        {
          path: "/sop-management",
          element: (
            <ProtectedRoute>
              <Sops />
            </ProtectedRoute>
          ),
        },
        {
          path: "/sop-activity",
          element: (
            <ProtectedRoute>
             <SopInstances/>
            </ProtectedRoute>
          ),
        },
        {
          path: "/audit",
          element: (
            <AdminRoute>
              <AuditLogs />
            </AdminRoute>
          ),
        },
        {
          path: "/access-control",
          element: (
            <AdminRoute>
              <AccessControl/>
            </AdminRoute>
          ),
        },
        {
          path: "/categories",
          element: (
            <AdminRoute>
              <ProcessCategories />
            </AdminRoute>
          ),
        },
        {
          path: "/",
          element: <RoleBasedHome />,
        },

      ]
    },
    {
      path: "*",
      element: <Navigate to="/login" replace />,
    },
  ]);
  return (
    <EntityProvider>
    <RouterProvider router={router} />
    </EntityProvider>
  );
}

/** Redirect to the user's appropriate home page */
function RoleBasedHome() {
  const session = getSession();
  const dest = getDefaultRoute(session);
  return <Navigate to={dest} replace />;
}