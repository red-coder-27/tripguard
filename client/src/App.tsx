import React, { useState, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { TripProvider } from './context/TripContext.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { Header } from './components/layout/Header.js';

// Lazy-loaded page components for optimal route-based bundle splitting
const AuthPage = lazy(() => import('./pages/AuthPage.js').then((m) => ({ default: m.AuthPage })));
const OverviewPage = lazy(() => import('./pages/OverviewPage.js').then((m) => ({ default: m.OverviewPage })));
const MyTripsPage = lazy(() => import('./pages/MyTripsPage.js').then((m) => ({ default: m.MyTripsPage })));
const TripDetailsPage = lazy(() => import('./pages/TripDetailsPage.js').then((m) => ({ default: m.TripDetailsPage })));
const ItineraryPage = lazy(() => import('./pages/ItineraryPage.js').then((m) => ({ default: m.ItineraryPage })));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage.js').then((m) => ({ default: m.ExpensesPage })));
const BookingsPage = lazy(() => import('./pages/BookingsPage.js').then((m) => ({ default: m.BookingsPage })));
const RecoveryCenterPage = lazy(() => import('./pages/RecoveryCenterPage.js').then((m) => ({ default: m.RecoveryCenterPage })));
const RecoveryLedgerPage = lazy(() => import('./pages/RecoveryLedgerPage.js').then((m) => ({ default: m.RecoveryLedgerPage })));
const SimulatorPage = lazy(() => import('./pages/SimulatorPage.js').then((m) => ({ default: m.SimulatorPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.js').then((m) => ({ default: m.AnalyticsPage })));
const CopilotPage = lazy(() => import('./pages/CopilotPage.js').then((m) => ({ default: m.CopilotPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage.js').then((m) => ({ default: m.SettingsPage })));
const TripMapPage = lazy(() => import('./pages/TripMapPage.js').then((m) => ({ default: m.TripMapPage })));
const DisruptionsPage = lazy(() => import('./pages/DisruptionsPage.js').then((m) => ({ default: m.DisruptionsPage })));
const TravelerToolsPage = lazy(() => import('./pages/TravelerToolsPage.js').then((m) => ({ default: m.TravelerToolsPage })));

const PageLoadingFallback: React.FC = () => (
  <div className="py-24 flex flex-col items-center justify-center">
    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
    <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
      Loading TripGuard Module...
    </span>
  </div>
);

const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>('/dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#101B2D] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
            TripGuard Core Initializing...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#101B2D] flex items-center justify-center text-white">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <AuthPage />
      </Suspense>
    );
  }

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/dashboard':
        return 'Overview Dashboard';
      case '/trips':
        return 'My Travel Portfolios';
      case '/trip-details':
        return 'Trip Workspace';
      case '/itinerary':
        return 'Itinerary Planner';
      case '/map':
        return 'GeoGuard Interactive Route Map';
      case '/disruptions':
        return 'Travel Disruptions & Alert Hub';
      case '/traveler-tools':
        return 'Traveler Tools & Collaboration';
      case '/expenses':
        return 'Expense Ledger';
      case '/bookings':
        return 'Booking Commitments';
      case '/recovery':
        return 'Recovery Center';
      case '/ledger':
        return 'Recovery Decision Ledger';
      case '/simulator':
        return 'What-If Simulator';
      case '/analytics':
        return 'Financial Analytics';
      case '/copilot':
        return 'TripGuard Copilot Assistant';
      case '/settings':
        return 'Settings';
      default:
        return 'Overview';
    }
  };

  const renderCurrentPage = () => {
    switch (currentPath) {
      case '/dashboard':
        return <OverviewPage onNavigate={setCurrentPath} />;
      case '/trips':
        return <MyTripsPage onNavigate={setCurrentPath} />;
      case '/trip-details':
        return <TripDetailsPage onNavigate={setCurrentPath} />;
      case '/itinerary':
        return <ItineraryPage />;
      case '/map':
        return <TripMapPage />;
      case '/disruptions':
        return <DisruptionsPage onNavigate={setCurrentPath} />;
      case '/traveler-tools':
        return <TravelerToolsPage />;
      case '/expenses':
        return <ExpensesPage />;
      case '/bookings':
        return <BookingsPage />;
      case '/recovery':
        return <RecoveryCenterPage />;
      case '/ledger':
        return <RecoveryLedgerPage />;
      case '/simulator':
        return <SimulatorPage />;
      case '/analytics':
        return <AnalyticsPage />;
      case '/copilot':
        return <CopilotPage onNavigate={setCurrentPath} />;
      case '/settings':
        return <SettingsPage />;
      default:
        return <OverviewPage onNavigate={setCurrentPath} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex text-[#172033]">
      {/* Dark Navigation Sidebar (Permanent on md+, Overlay on mobile) */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={setCurrentPath}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Sticky Header with Context Bar and Portals */}
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          pageTitle={getPageTitle(currentPath)}
          currentPath={currentPath}
          onNavigate={setCurrentPath}
        />

        {/* Dynamic Page Content with Suspense Boundary */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex-1">
          <Suspense fallback={<PageLoadingFallback />}>{renderCurrentPage()}</Suspense>
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <TripProvider>
        <MainApp />
      </TripProvider>
    </AuthProvider>
  );
}

export default App;
