import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import AdvertiserLayout from './layouts/AdvertiserLayout';
import PublisherLayout from './layouts/PublisherLayout';

// Pages
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminFinance from './pages/admin/Finance';
import AdminSystem from './pages/admin/System';

import AdvertiserDashboard from './pages/advertiser/Dashboard';
import AdvertiserCampaigns from './pages/advertiser/Campaigns';
import AdvertiserCreatives from './pages/advertiser/Creatives';
import AdvertiserAnalytics from './pages/advertiser/Analytics';
import AdvertiserBilling from './pages/advertiser/Billing';

import PublisherDashboard from './pages/publisher/Dashboard';
import PublisherSites from './pages/publisher/Sites';
import PublisherAdUnits from './pages/publisher/AdUnits';
import PublisherRevenue from './pages/publisher/Revenue';
import PublisherPayments from './pages/publisher/Payments';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  const { user, isAuthenticated } = useAuthStore();

  // Protected Route wrapper
  const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
      return <Navigate to="/" replace />;
    }

    return <>{children}</>;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="finance" element={<AdminFinance />} />
            <Route path="system" element={<AdminSystem />} />
          </Route>

          {/* Advertiser Routes */}
          <Route
            path="/advertiser/*"
            element={
              <ProtectedRoute allowedRoles={['advertiser', 'agency']}>
                <AdvertiserLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdvertiserDashboard />} />
            <Route path="campaigns" element={<AdvertiserCampaigns />} />
            <Route path="creatives" element={<AdvertiserCreatives />} />
            <Route path="analytics" element={<AdvertiserAnalytics />} />
            <Route path="billing" element={<AdvertiserBilling />} />
          </Route>

          {/* Publisher Routes */}
          <Route
            path="/publisher/*"
            element={
              <ProtectedRoute allowedRoles={['publisher']}>
                <PublisherLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PublisherDashboard />} />
            <Route path="sites" element={<PublisherSites />} />
            <Route path="ad-units" element={<PublisherAdUnits />} />
            <Route path="revenue" element={<PublisherRevenue />} />
            <Route path="payments" element={<PublisherPayments />} />
          </Route>

          {/* Default redirect based on role */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                user?.role === 'admin' ? (
                  <Navigate to="/admin" replace />
                ) : user?.role === 'publisher' ? (
                  <Navigate to="/publisher" replace />
                ) : (
                  <Navigate to="/advertiser" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
