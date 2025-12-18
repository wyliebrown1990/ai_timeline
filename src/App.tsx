import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider } from './context/ChatContext';
import { UserProfileProvider } from './contexts/UserProfileContext';
import { AuthProvider } from './contexts/AuthContext';
import { OnboardingWrapper } from './components/Onboarding';
import { ApiKeyProvider, ApiKeyModal } from './components/ApiKey';
import { ProtectedRoute } from './components/auth';
import Layout from './components/Layout';
import { AdminLayout } from './components/admin/AdminLayout';
import HomePage from './pages/HomePage';
import TimelinePage from './pages/TimelinePage';
import LearningPathsPage from './pages/LearningPathsPage';
import GlossaryPage from './pages/GlossaryPage';
import NewsPage from './pages/NewsPage';
import SettingsPage from './pages/SettingsPage';
import {
  AdminDashboard,
  MilestonesListPage,
  CreateMilestonePage,
  EditMilestonePage,
  LoginPage,
} from './pages/admin';

/**
 * Root application component
 * Sets up routing and the main layout structure
 */
function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <BrowserRouter>
        <UserProfileProvider>
          <ApiKeyProvider>
            <ChatProvider>
              {/* API Key Modal - shown when AI features require key */}
              <ApiKeyModal />

              {/* Toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#2D3436',
                  color: '#F5F3EF',
                  borderRadius: '12px',
                },
                success: {
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#F5F3EF',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#E07A5F',
                    secondary: '#F5F3EF',
                  },
                },
              }}
            />

            {/* Onboarding wrapper for first-time visitors */}
            <OnboardingWrapper>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="timeline" element={<TimelinePage />} />
                  <Route path="learn" element={<LearningPathsPage />} />
                  <Route path="learn/:pathId" element={<LearningPathsPage />} />
                  <Route path="learn/:pathId/complete" element={<LearningPathsPage />} />
                  <Route path="news" element={<NewsPage />} />
                  <Route path="glossary" element={<GlossaryPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* Admin routes - wrapped in AuthProvider for authentication */}
                <Route
                  path="/admin"
                  element={
                    <AuthProvider>
                      <ProtectedRoute>
                        <AdminLayout />
                      </ProtectedRoute>
                    </AuthProvider>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="milestones" element={<MilestonesListPage />} />
                  <Route path="milestones/new" element={<CreateMilestonePage />} />
                  <Route path="milestones/:id/edit" element={<EditMilestonePage />} />
                </Route>

                {/* Admin login route - outside protected wrapper */}
                <Route
                  path="/admin/login"
                  element={
                    <AuthProvider>
                      <LoginPage />
                    </AuthProvider>
                  }
                />
              </Routes>
            </OnboardingWrapper>
            </ChatProvider>
          </ApiKeyProvider>
        </UserProfileProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
