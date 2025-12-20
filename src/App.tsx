import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider } from './context/ChatContext';
import { UserProfileProvider } from './contexts/UserProfileContext';
import { SessionProvider } from './contexts/SessionContext';
import { FlashcardProvider } from './contexts/FlashcardContext';
import { AuthProvider } from './contexts/AuthContext';
import { OnboardingWrapper } from './components/Onboarding';
import { ApiKeyProvider, ApiKeyModal } from './components/ApiKey';
import { ProtectedRoute } from './components/auth';
import Layout from './components/Layout';
import { AdminLayout } from './components/admin/AdminLayout';
import { PageLoader } from './components/PageLoader';

// Eagerly loaded pages (main entry points)
import HomePage from './pages/HomePage';

// Lazy-loaded main pages
const TimelinePage = lazy(() => import('./pages/TimelinePage'));

// Lazy-loaded secondary pages
const LearningPathsPage = lazy(() => import('./pages/LearningPathsPage'));
const GlossaryPage = lazy(() => import('./pages/GlossaryPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Lazy-loaded study pages
const StudyPage = lazy(() => import('./pages/StudyPage'));
const StudySessionPage = lazy(() => import('./pages/StudySessionPage'));
const StudyStatsPage = lazy(() => import('./pages/StudyStatsPage'));
const PackDetailPage = lazy(() => import('./pages/PackDetailPage'));

// Lazy-loaded admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const MilestonesListPage = lazy(() => import('./pages/admin/MilestonesListPage'));
const CreateMilestonePage = lazy(() => import('./pages/admin/CreateMilestonePage'));
const EditMilestonePage = lazy(() => import('./pages/admin/EditMilestonePage'));
const LoginPage = lazy(() => import('./pages/admin/LoginPage'));
const ApiMonitoringPage = lazy(() => import('./pages/admin/ApiMonitoringPage'));
const SourcesPage = lazy(() => import('./pages/admin/SourcesPage'));
const IngestedArticlesPage = lazy(() => import('./pages/admin/IngestedArticlesPage'));
const ArticleDetailPage = lazy(() => import('./pages/admin/ArticleDetailPage'));
const ReviewQueuePage = lazy(() => import('./pages/admin/ReviewQueuePage'));
const GlossaryAdminPage = lazy(() => import('./pages/admin/GlossaryAdminPage'));

/**
 * Scrolls to top of page on route change
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

/**
 * Root application component
 * Sets up routing and the main layout structure
 */
function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <BrowserRouter>
        <ScrollToTop />
        <UserProfileProvider>
          <SessionProvider>
            <FlashcardProvider>
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
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Layout />}>
                    {/* Eagerly loaded entry points */}
                    <Route index element={<HomePage />} />
                    <Route path="timeline" element={<TimelinePage />} />

                    {/* Lazy-loaded secondary pages */}
                    <Route path="learn" element={<LearningPathsPage />} />
                    <Route path="learn/:pathId" element={<LearningPathsPage />} />
                    <Route path="learn/:pathId/complete" element={<LearningPathsPage />} />
                    <Route path="news" element={<NewsPage />} />
                    <Route path="glossary" element={<GlossaryPage />} />
                    <Route path="settings" element={<SettingsPage />} />

                    {/* Lazy-loaded study pages */}
                    <Route path="study" element={<StudyPage />} />
                    <Route path="study/stats" element={<StudyStatsPage />} />
                    <Route path="study/session" element={<StudySessionPage />} />
                    <Route path="study/session/:packId" element={<StudySessionPage />} />
                    <Route path="study/packs/:packId" element={<PackDetailPage />} />
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
                    <Route path="sources" element={<SourcesPage />} />
                    <Route path="articles" element={<IngestedArticlesPage />} />
                    <Route path="articles/:id" element={<ArticleDetailPage />} />
                    <Route path="review" element={<ReviewQueuePage />} />
                    <Route path="glossary" element={<GlossaryAdminPage />} />
                    <Route path="api-monitoring" element={<ApiMonitoringPage />} />
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
              </Suspense>
            </OnboardingWrapper>
              </ChatProvider>
              </ApiKeyProvider>
            </FlashcardProvider>
          </SessionProvider>
        </UserProfileProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
