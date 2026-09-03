import { useLocation, createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Callback from './pages/Callback';
import Dashboard from './pages/Dashboard';
import ParentPage from './pages/ParentPage';
import Tasks from './pages/Tasks';
import Inbox from './pages/Inbox';
import Sops from './pages/Sops';
import AuditLogs from './pages/AuditLogs';
import { getSession } from './auth/auth';
import './index.css';
import AccessControl from './pages/AccessControl';
import ProcessCategories from './pages/ProcessCategories';

function ProtectedRoute({ children }) {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const session = getSession();

  if (session) {
    return <Navigate to="/dashboard" replace />;
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
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          ),
        },
        {
          path: "/tasks",
          element: (
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
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
          path: "/sops",
          element: (
            <ProtectedRoute>
              <Sops />
            </ProtectedRoute>
          ),
        },
        {
          path: "/audit",
          element: (
            <ProtectedRoute>
              <AuditLogs />
            </ProtectedRoute>
          ),
        },
        {
          path: "/access-control",
          element: (
            <ProtectedRoute>
              <AccessControl/>
            </ProtectedRoute>
          ),
        },
        {
          path: "/categories",
          element: (
            <ProtectedRoute>
              <ProcessCategories />
            </ProtectedRoute>
          ),
        },
        {
          path: "/",
          element: <Navigate to="/dashboard" replace />,
        },

      ]
    },
    {
      path: "*",
      element: <Navigate to="/login" replace />,
    },
  ]);
  return (
    <RouterProvider router={router} />
  );
}