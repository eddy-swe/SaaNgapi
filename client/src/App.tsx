import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { EventTypesPage } from './pages/EventTypesPage';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { BookingsPage } from './pages/BookingsPage';
import { PublicBookingPage } from './pages/PublicBookingPage';
import { BookingConfirmationPage } from './pages/BookingConfirmationPage';
import { useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

// Protected Route Guard for Host Dashboard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const location = useLocation();

  // Hide Navbar & Footer on public booking pages to provide clean distraction-free booking flow
  const isPublicBookingView =
    location.pathname.startsWith('/booking/confirmed') ||
    (!location.pathname.startsWith('/dashboard') &&
      !['/', '/login', '/register'].includes(location.pathname));

  return (
    <div className="flex flex-col min-h-screen">
      {!isPublicBookingView && <Navbar />}

      <main className="flex-1">
        <Routes>
          {/* Public Home & Auth */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Host Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/events"
            element={
              <ProtectedRoute>
                <EventTypesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/availability"
            element={
              <ProtectedRoute>
                <AvailabilityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/bookings"
            element={
              <ProtectedRoute>
                <BookingsPage />
              </ProtectedRoute>
            }
          />

          {/* Public Booking Confirmation Screen */}
          <Route path="/booking/confirmed/:id" element={<BookingConfirmationPage />} />

          {/* Dynamic Public Booking Routes: /:username and /:username/:eventSlug */}
          <Route path="/:username" element={<PublicBookingPage />} />
          <Route path="/:username/:eventSlug" element={<PublicBookingPage />} />

          {/* 404 Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isPublicBookingView && <Footer />}
    </div>
  );
};

export default App;
