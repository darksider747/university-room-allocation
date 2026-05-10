import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SocketProvider }        from './context/SocketContext.jsx';
import Layout                    from './components/layout/Layout.jsx';

// Auth
import LoginPage    from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';

// Shared
import DashboardPage        from './pages/DashboardPage.jsx';
import RoomsPage            from './pages/RoomsPage.jsx';
import ProfilePage          from './pages/ProfilePage.jsx';
import BookingPage          from './pages/BookingPage.jsx';
import QueuePage            from './pages/QueuePage.jsx';
import AllocationHistoryPage from './pages/AllocationHistoryPage.jsx';
import AdminPage            from './pages/AdminPage.jsx';

// HOD
import HodDashboard     from './pages/hod/HodDashboard.jsx';
import HodAnalyticsPage from './pages/hod/HodAnalyticsPage.jsx';

// Student
import StudentTimetablePage from './pages/student/StudentTimetablePage.jsx';
import NotificationsPage    from './pages/student/NotificationsPage.jsx';

// Faculty
import FacultySchedulePage from './pages/faculty/FacultySchedulePage.jsx';

function Spinner() {
  return (
    <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center' }}>
      <div className="spinner" style={{ width:40, height:40 }} />
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  // Role-based default redirect after login
  const defaultRoute = () => {
    if (!user) return '/login';
    if (user.role === 'hod')         return '/hod';
    if (user.role === 'faculty')     return '/faculty/schedule';
    if (user.role === 'student')     return '/student/timetable';
    return '/dashboard';
  };

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Protected shell */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to={defaultRoute()} replace />} />

        {/* Shared */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile"   element={<ProfilePage />} />
        <Route path="/rooms"     element={<RoomsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Admin / Super Admin */}
        <Route path="/admin"   element={<ProtectedRoute roles={['super_admin','admin']}><AdminPage /></ProtectedRoute>} />
        <Route path="/book"    element={<ProtectedRoute roles={['super_admin','admin','student']}><BookingPage /></ProtectedRoute>} />
        <Route path="/queue"   element={<ProtectedRoute roles={['super_admin','admin']}><QueuePage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute roles={['super_admin','admin','student']}><AllocationHistoryPage /></ProtectedRoute>} />

        {/* HOD */}
        <Route path="/hod"           element={<ProtectedRoute roles={['hod','super_admin']}><HodDashboard /></ProtectedRoute>} />
        <Route path="/hod/rooms"     element={<ProtectedRoute roles={['hod','super_admin']}><RoomsPage /></ProtectedRoute>} />
        <Route path="/hod/analytics" element={<ProtectedRoute roles={['hod','super_admin']}><HodAnalyticsPage /></ProtectedRoute>} />

        {/* Faculty */}
        <Route path="/faculty/schedule" element={<ProtectedRoute roles={['faculty','hod','super_admin']}><FacultySchedulePage /></ProtectedRoute>} />
        <Route path="/faculty/prefs"    element={<ProtectedRoute roles={['faculty','hod','super_admin']}><FacultySchedulePage /></ProtectedRoute>} />

        {/* Student */}
        <Route path="/student/timetable" element={<ProtectedRoute roles={['student','super_admin']}><StudentTimetablePage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to={defaultRoute()} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </AuthProvider>
  );
}
