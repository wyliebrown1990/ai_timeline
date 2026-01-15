import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider } from './context/ChatContext';
import { UserProfileProvider } from './contexts/UserProfileContext';
import { SessionProvider } from './contexts/SessionContext';
import { FlashcardProvider } from './contexts/FlashcardContext';
import { AuthProvider } from './contexts/AuthContext';
import { UserAuthProvider } from './contexts/UserAuthContext';
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
const ConceptsPage = lazy(() => import('./pages/ConceptsPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));
const NewsQuizPage = lazy(() => import('./pages/NewsQuizPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));

// Sprint KPC-2: Profile pages
const PersonProfilePage = lazy(() => import('./pages/PersonProfilePage'));
const OrganizationProfilePage = lazy(() => import('./pages/OrganizationProfilePage'));

// Sprint Subj-5: Subject discovery pages
const SubjectsPage = lazy(() => import('./pages/SubjectsPage'));
const SubjectPage = lazy(() => import('./pages/SubjectPage'));

// Sprint LEarn-3: User auth pages
const UserLoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));

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
const SubmitArticlePage = lazy(() => import('./pages/admin/SubmitArticlePage'));
const CreateNewsEventPage = lazy(() => import('./pages/admin/CreateNewsEventPage'));
const CreateGlossaryTermPage = lazy(() => import('./pages/admin/CreateGlossaryTermPage'));
const KeyFiguresPage = lazy(() => import('./pages/admin/KeyFiguresPage'));
const CreateKeyFigurePage = lazy(() => import('./pages/admin/CreateKeyFigurePage'));
const EditKeyFigurePage = lazy(() => import('./pages/admin/EditKeyFigurePage'));
const KeyFigureDraftsPage = lazy(() => import('./pages/admin/KeyFigureDraftsPage'));
const MergeKeyFiguresPage = lazy(() => import('./pages/admin/MergeKeyFiguresPage'));
const PersonDraftsPage = lazy(() => import('./pages/admin/PersonDraftsPage'));
const CommentModerationPage = lazy(() => import('./pages/admin/CommentModerationPage'));
const SpamFiltersPage = lazy(() => import('./pages/admin/SpamFiltersPage'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const SubjectsAdminPage = lazy(() => import('./pages/admin/SubjectsAdminPage'));

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
        <UserAuthProvider>
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
                    <Route path="news/quiz" element={<NewsQuizPage />} />
                    <Route path="glossary" element={<GlossaryPage />} />
                    <Route path="concepts" element={<ConceptsPage />} />
                    <Route path="contact" element={<ContactPage />} />
                    <Route path="settings" element={<SettingsPage />} />

                    {/* Sprint KPC-2: Profile pages */}
                    <Route path="people/:slug" element={<PersonProfilePage />} />
                    <Route path="organizations/:slug" element={<OrganizationProfilePage />} />

                    {/* Sprint Subj-5: Subject discovery pages */}
                    <Route path="subjects" element={<SubjectsPage />} />
                    <Route path="subjects/:slug" element={<SubjectPage />} />

                    {/* Sprint LEarn-3: User profiles */}
                    <Route path="u/:username" element={<UserProfilePage />} />

                    {/* Lazy-loaded study pages */}
                    <Route path="study" element={<StudyPage />} />
                    <Route path="study/stats" element={<StudyStatsPage />} />
                    <Route path="study/session" element={<StudySessionPage />} />
                    <Route path="study/session/:packId" element={<StudySessionPage />} />
                    <Route path="study/packs/:packId" element={<PackDetailPage />} />
                  </Route>

                  {/* User auth routes - outside Layout for full-page design */}
                  <Route path="/login" element={<UserLoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

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
                    <Route path="glossary/new" element={<CreateGlossaryTermPage />} />
                    <Route path="news-events/new" element={<CreateNewsEventPage />} />
                    <Route path="submit-article" element={<SubmitArticlePage />} />
                    <Route path="api-monitoring" element={<ApiMonitoringPage />} />
                    <Route path="key-figures" element={<KeyFiguresPage />} />
                    <Route path="key-figures/new" element={<CreateKeyFigurePage />} />
                    <Route path="key-figures/:id/edit" element={<EditKeyFigurePage />} />
                    <Route path="key-figures/review" element={<KeyFigureDraftsPage />} />
                    <Route path="key-figures/merge" element={<MergeKeyFiguresPage />} />
                    <Route path="person-drafts" element={<PersonDraftsPage />} />
                    <Route path="comments" element={<CommentModerationPage />} />
                    <Route path="spam-filters" element={<SpamFiltersPage />} />
                    <Route path="users" element={<UserManagementPage />} />
                    <Route path="subjects" element={<SubjectsAdminPage />} />
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
        </UserAuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
