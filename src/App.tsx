import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider } from './context/ChatContext';
import Layout from './components/Layout';
import { AdminLayout } from './components/admin/AdminLayout';
import HomePage from './pages/HomePage';
import TimelinePage from './pages/TimelinePage';
import LearningPathsPage from './pages/LearningPathsPage';
import GlossaryPage from './pages/GlossaryPage';
import {
  AdminDashboard,
  MilestonesListPage,
  CreateMilestonePage,
  EditMilestonePage,
} from './pages/admin';

/**
 * Root application component
 * Sets up routing and the main layout structure
 */
function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <BrowserRouter>
        <ChatProvider>
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />

          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="timeline" element={<TimelinePage />} />
              <Route path="learn" element={<LearningPathsPage />} />
              <Route path="learn/:pathId" element={<LearningPathsPage />} />
              <Route path="learn/:pathId/complete" element={<LearningPathsPage />} />
              <Route path="glossary" element={<GlossaryPage />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="milestones" element={<MilestonesListPage />} />
              <Route path="milestones/new" element={<CreateMilestonePage />} />
              <Route path="milestones/:id/edit" element={<EditMilestonePage />} />
            </Route>
          </Routes>
        </ChatProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
