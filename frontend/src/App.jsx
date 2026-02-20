import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import BusinessSelection from './pages/BusinessSelection';
import BusinessHome from './pages/BusinessHome';
import { AuthProvider, useAuth } from './context/AuthContext';

import MasterAdminDashboard from './pages/MasterAdminDashboard';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const MasterAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user?.is_master_admin ? children : <Navigate to="/login" />;
};

import GlobalErrorBoundary from './components/GlobalErrorBoundary';

function App() {
  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/admin/dashboard" element={
              <MasterAdminRoute>
                <MasterAdminDashboard />
              </MasterAdminRoute>
            } />
            <Route path="/select-business" element={
              <ProtectedRoute>
                <BusinessSelection />
              </ProtectedRoute>
            } />
            <Route path="/business/:id" element={
              <ProtectedRoute>
                <BusinessHome />
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
