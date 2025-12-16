import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './app/layout';
import { initializeStores } from './stores';
import { ErrorBoundary } from './components/shared';
import './index.css';

// Lazy load route components
const DashboardPage = React.lazy(() => import('./app/routes/dashboard'));
const AnalyzerPage = React.lazy(() => import('./app/routes/analyzer'));
const ResearchPage = React.lazy(() => import('./app/routes/research'));
const StoriesPage = React.lazy(() => import('./app/routes/stories'));
const InterviewPage = React.lazy(() => import('./app/routes/interview'));
const AnswersPage = React.lazy(() => import('./app/routes/answers'));
const ProfilePage = React.lazy(() => import('./app/routes/profile'));

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Initialize stores and run migrations
initializeStores();

// Loading fallback
const PageLoader: React.FC = () => (
  <div className="h-full flex items-center justify-center">
    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
  </div>
);

// App component
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route
                index
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <DashboardPage />
                  </React.Suspense>
                }
              />
              <Route
                path="analyzer"
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <AnalyzerPage />
                  </React.Suspense>
                }
              />
              <Route
                path="research"
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <ResearchPage />
                  </React.Suspense>
                }
              />
              <Route
                path="stories"
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <StoriesPage />
                  </React.Suspense>
                }
              />
              <Route
                path="interview"
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <InterviewPage />
                  </React.Suspense>
                }
              />
              <Route
                path="answers"
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <AnswersPage />
                  </React.Suspense>
                }
              />
              <Route
                path="profile"
                element={
                  <React.Suspense fallback={<PageLoader />}>
                    <ProfilePage />
                  </React.Suspense>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

// Mount app
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
