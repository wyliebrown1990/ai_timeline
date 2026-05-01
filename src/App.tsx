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
const TimelineSlugPage = lazy(() => import('./pages/TimelineSlugPage')); // Sprint TD-2 - Era + Filter landing pages
const DataExportPage = lazy(() => import('./pages/DataExportPage')); // Sprint TD-4 - Linkable Assets
const ResourcesPage = lazy(() => import('./pages/ResourcesPage')); // Sprint TD-4 - Resources hub
const EmbedTimelinePage = lazy(() => import('./pages/EmbedTimelinePage')); // Sprint TD-4 - Embed widget
const EmbedConfigPage = lazy(() => import('./pages/EmbedConfigPage')); // Sprint TD-4 - Embed config
const ReportsPage = lazy(() => import('./pages/ReportsPage')); // Sprint TD-4 - Annual reports
const PDFDownloadPage = lazy(() => import('./pages/PDFDownloadPage')); // Sprint TD-4 - PDF download
const InfographicsPage = lazy(() => import('./pages/InfographicsPage')); // Sprint TD-4 - Infographics
const YearReportPage = lazy(() => import('./pages/YearReportPage')); // Sprint TD-4 - Year report
const ComparePage = lazy(() => import('./pages/ComparePage')); // Sprint SEO-4 - Comparison pages
const ExplainedPage = lazy(() => import('./pages/ExplainedPage')); // Sprint SEO-4 - Explained pages
const EventPage = lazy(() => import('./pages/EventPage')); // Sprint SEO-4 - Event pages
const WhoInventedPage = lazy(() => import('./pages/WhoInventedPage')); // Sprint SEO-4 - Who Invented pages

// Sprint SEO-4: Hub pages
const CompareHubPage = lazy(() => import('./pages/CompareHubPage'));
const ExplainedHubPage = lazy(() => import('./pages/ExplainedHubPage'));
const EventsHubPage = lazy(() => import('./pages/EventsHubPage'));
const WhoInventedHubPage = lazy(() => import('./pages/WhoInventedHubPage'));

// Site-wide 404 fallback (Blog-1 QA finding: /blog and every other unmatched URL
// used to render a blank page because there was no catch-all route)
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Sprint Blog-2: Public reader pages
const BlogIndexPage = lazy(() => import('./pages/BlogIndexPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));

// Sprint Blog-4: Archive pages
const BlogTagPage = lazy(() => import('./pages/BlogTagPage'));
const AuthorPage = lazy(() => import('./pages/AuthorPage'));

// People hub — listed in the Header "More" dropdown
const PeoplePage = lazy(() => import('./pages/PeoplePage'));

// Sprint Blog-3: Admin CMS
const BlogAdminListPage = lazy(() => import('./pages/admin/BlogAdminListPage'));
const BlogEditorPage = lazy(() => import('./pages/admin/BlogEditorPage'));
const AuthorsAdminPage = lazy(() => import('./pages/admin/AuthorsAdminPage'));

// Lazy-loaded secondary pages
const LearningPathsPage = lazy(() => import('./pages/LearningPathsPage'));
const GlossaryPage = lazy(() => import('./pages/GlossaryPage'));
const GlossaryTermPage = lazy(() => import('./pages/GlossaryTermPage'));
const ConceptsPage = lazy(() => import('./pages/ConceptsPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));
const NewsQuizPage = lazy(() => import('./pages/NewsQuizPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AboutPage = lazy(() => import('./pages/AboutPage')); // Sprint SEO-5 - E-E-A-T signals

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

// Sprint Feed-2: AI News Shorts feed
const FeedPage = lazy(() => import('./pages/FeedPage'));

// Sprint Feed-5: News detail page for sharing with OG tags
const NewsDetailPage = lazy(() => import('./pages/NewsDetailPage'));

// Sprint Feed-5: Collections page
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'));

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
const SeoContentGeneratorPage = lazy(() => import('./pages/admin/SeoContentGeneratorPage')); // Sprint SEO-4 Task 8
const SeoInsightsPage = lazy(() => import('./pages/admin/SeoInsightsPage'));
const SeoClustersPage = lazy(() => import('./pages/admin/SeoClustersPage'));
const SeoActionsPage = lazy(() => import('./pages/admin/SeoActionsPage'));
const SeoProposalsPage = lazy(() => import('./pages/admin/SeoProposalsPage'));
const SeoExperimentsPage = lazy(() => import('./pages/admin/SeoExperimentsPage'));
const SeoPackagingPage = lazy(() => import('./pages/admin/SeoPackagingPage'));
const ExtensionDownloadPage = lazy(() => import('./pages/admin/ExtensionDownloadPage'));

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
                    <Route path="timeline/data" element={<DataExportPage />} /> {/* Sprint TD-4 - Data export */}
                    <Route path="timeline/download" element={<PDFDownloadPage />} /> {/* Sprint TD-4 - PDF download */}
                    <Route path="timeline/infographics" element={<InfographicsPage />} /> {/* Sprint TD-4 - Infographics */}
                    <Route path="timeline/embed" element={<EmbedConfigPage />} /> {/* Sprint TD-4 - Embed config */}
                    <Route path="timeline/:slug" element={<TimelineSlugPage />} /> {/* Sprint TD-2 - Era + Filter pages */}

                    {/* Lazy-loaded secondary pages */}
                    <Route path="learn" element={<LearningPathsPage />} />
                    <Route path="learn/:pathId" element={<LearningPathsPage />} />
                    <Route path="learn/:pathId/complete" element={<LearningPathsPage />} />
                    <Route path="news" element={<NewsPage />} />
                    <Route path="news/quiz" element={<NewsQuizPage />} />
                    <Route path="glossary" element={<GlossaryPage />} />
                    <Route path="glossary/:slug" element={<GlossaryTermPage />} />
                    <Route path="concepts" element={<ConceptsPage />} />
                    <Route path="contact" element={<ContactPage />} />
                    <Route path="resources" element={<ResourcesPage />} /> {/* Sprint TD-4 - Resources hub */}
                    <Route path="reports" element={<ReportsPage />} /> {/* Sprint TD-4 - Annual reports */}
                    <Route path="reports/:year" element={<YearReportPage />} /> {/* Sprint TD-4 - Year report */}
                    <Route path="about" element={<AboutPage />} /> {/* Sprint SEO-5 - E-E-A-T */}
                    <Route path="settings" element={<SettingsPage />} />

                    {/* Sprint KPC-2: Profile pages */}
                    {/* People hub (literal path first so it doesn't collide with :slug) */}
                    <Route path="people" element={<PeoplePage />} />
                    <Route path="people/:slug" element={<PersonProfilePage />} />
                    <Route path="organizations/:slug" element={<OrganizationProfilePage />} />

                    {/* Sprint Subj-5: Subject discovery pages */}
                    <Route path="subjects" element={<SubjectsPage />} />
                    <Route path="subjects/:slug" element={<SubjectPage />} />

                    {/* Sprint SEO-4: Hub pages (must come before individual pages) */}
                    <Route path="compare" element={<CompareHubPage />} />
                    <Route path="explained" element={<ExplainedHubPage />} />
                    <Route path="events" element={<EventsHubPage />} />
                    <Route path="who-invented" element={<WhoInventedHubPage />} />

                    {/* Sprint SEO-4: Comparison pages */}
                    <Route path="compare/:type/:slugs" element={<ComparePage />} />

                    {/* Sprint SEO-4: Explained pages */}
                    <Route path="explained/:slug" element={<ExplainedPage />} />

                    {/* Sprint SEO-4: Event pages */}
                    <Route path="events/:id" element={<EventPage />} />

                    {/* Sprint SEO-4: Who Invented pages */}
                    <Route path="who-invented/:slug" element={<WhoInventedPage />} />

                    {/* Sprint LEarn-3: User profiles */}
                    <Route path="u/:username" element={<UserProfilePage />} />

                    {/* Lazy-loaded study pages */}
                    <Route path="study" element={<StudyPage />} />
                    <Route path="study/stats" element={<StudyStatsPage />} />
                    <Route path="study/session" element={<StudySessionPage />} />
                    <Route path="study/session/:packId" element={<StudySessionPage />} />
                    <Route path="study/packs/:packId" element={<PackDetailPage />} />

                    {/* Sprint Blog-2: Public reader */}
                    <Route path="blog" element={<BlogIndexPage />} />
                    {/* Sprint Blog-4: Archive pages (before :slug so literals win) */}
                    <Route path="blog/tag/:tag" element={<BlogTagPage />} />
                    <Route path="blog/author/:slug" element={<AuthorPage />} />
                    <Route path="blog/:slug" element={<BlogPostPage />} />

                    {/* Catch-all 404 inside Layout — renders with header/footer chrome.
                        Caught during Sprint Blog-1 live QA: /blog was rendering a
                        completely blank page because no route matched. */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>

                  {/* User auth routes - outside Layout for full-page design */}
                  <Route path="/login" element={<UserLoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  {/* Feed route - outside Layout for full-screen experience */}
                  <Route path="/feed" element={<FeedPage />} />

                  {/* News detail page for sharing - Sprint Feed-5 OG tags */}
                  <Route path="/news/:id" element={<NewsDetailPage />} />

                  {/* Collections route - outside Layout for full-screen experience */}
                  <Route path="/collections" element={<CollectionsPage />} />
                  <Route path="/collections/:id" element={<CollectionsPage />} />

                  {/* Embed route - outside Layout for iframe embedding (Sprint TD-4) */}
                  <Route path="/embed/timeline" element={<EmbedTimelinePage />} />

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
                    <Route path="seo-insights" element={<SeoInsightsPage />} />
                    <Route path="seo-insights/clusters" element={<SeoClustersPage />} />
                    <Route path="seo-insights/actions" element={<SeoActionsPage />} />
                    <Route path="seo-insights/proposals" element={<SeoProposalsPage />} />
                    <Route path="seo-insights/experiments" element={<SeoExperimentsPage />} />
                    <Route path="seo-insights/packaging" element={<SeoPackagingPage />} />
                    <Route path="seo-content" element={<SeoContentGeneratorPage />} />
                    <Route path="extensions" element={<ExtensionDownloadPage />} />
                    <Route path="extension" element={<ExtensionDownloadPage />} />
                    {/* Sprint Blog-3: Admin CMS */}
                    <Route path="blog" element={<BlogAdminListPage />} />
                    <Route path="blog/new" element={<BlogEditorPage mode="new" />} />
                    <Route path="blog/:id/edit" element={<BlogEditorPage mode="edit" />} />
                    <Route path="authors" element={<AuthorsAdminPage />} />
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
