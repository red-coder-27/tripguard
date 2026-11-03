import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { TripProvider } from './context/TripContext.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { Header } from './components/layout/Header.js';

import { AuthPage } from './pages/AuthPage.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { MyTripsPage } from './pages/MyTripsPage.js';
import { TripDetailsPage } from './pages/TripDetailsPage.js';
import { ItineraryPage } from './pages/ItineraryPage.js';
import { ExpensesPage } from './pages/ExpensesPage.js';
import { BookingsPage } from './pages/BookingsPage.js';
import { RecoveryCenterPage } from './pages/RecoveryCenterPage.js';
import { RecoveryLedgerPage } from './pages/RecoveryLedgerPage.js';
import { SimulatorPage } from './pages/SimulatorPage.js';
import { AnalyticsPage } from './pages/AnalyticsPage.js';
import { CopilotPage } from './pages/CopilotPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { TripMapPage } from './pages/TripMapPage.js';
import { DisruptionsPage } from './pages/DisruptionsPage.js';
import { TravelerToolsPage } from './pages/TravelerToolsPage.js';

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
    return <AuthPage />;
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Header */}
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          pageTitle={getPageTitle(currentPath)}
          currentPath={currentPath}
          onNavigate={setCurrentPath}
        />

        {/* Workspace Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <TripProvider>
        <MainApp />
      </TripProvider>
    </AuthProvider>
  );
};

export default App;
