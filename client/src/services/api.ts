import {
  Trip,
  ItineraryItem,
  Booking,
  Expense,
  FinancialForecastBreakdown,
  RecoveryRun,
  RecoveryStrategyResult,
  AuditEvent,
  User,
} from '../types/index.js';

const API_BASE = '/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('tripguard_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ success: boolean; token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async register(
    name: string,
    email: string,
    password: string,
    baseCurrency: string = 'INR'
  ): Promise<{ success: boolean; token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, baseCurrency }),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async updateSettings(settings: Partial<User>): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`${API_BASE}/auth/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(settings),
    });
    return handleResponse(res);
  },

  // Trips
  async getTrips(): Promise<{ success: boolean; trips: Trip[] }> {
    const res = await fetch(`${API_BASE}/trips`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getTrip(id: string): Promise<{ success: boolean; trip: Trip }> {
    const res = await fetch(`${API_BASE}/trips/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async createTrip(payload: Partial<Trip>): Promise<{ success: boolean; trip: Trip }> {
    const res = await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateTrip(id: string, payload: Partial<Trip>): Promise<{ success: boolean; trip: Trip }> {
    const res = await fetch(`${API_BASE}/trips/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteTrip(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/trips/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Itinerary
  async getItinerary(tripId: string): Promise<{ success: boolean; items: ItineraryItem[] }> {
    const res = await fetch(`${API_BASE}/itineraries/trip/${tripId}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async createItineraryItem(payload: Partial<ItineraryItem>): Promise<{ success: boolean; item: ItineraryItem }> {
    const res = await fetch(`${API_BASE}/itineraries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateItineraryItem(
    id: string,
    payload: Partial<ItineraryItem>
  ): Promise<{ success: boolean; item: ItineraryItem }> {
    const res = await fetch(`${API_BASE}/itineraries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteItineraryItem(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/itineraries/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Expenses
  async getExpenses(tripId: string): Promise<{ success: boolean; expenses: Expense[] }> {
    const res = await fetch(`${API_BASE}/expenses/trip/${tripId}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async createExpense(payload: Partial<Expense>): Promise<{ success: boolean; expense: Expense }> {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateExpense(id: string, payload: Partial<Expense>): Promise<{ success: boolean; expense: Expense }> {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteExpense(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Bookings
  async getBookings(tripId: string): Promise<{ success: boolean; bookings: Booking[] }> {
    const res = await fetch(`${API_BASE}/bookings/trip/${tripId}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async createBooking(payload: Partial<Booking>): Promise<{ success: boolean; booking: Booking }> {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateBooking(id: string, payload: Partial<Booking>): Promise<{ success: boolean; booking: Booking }> {
    const res = await fetch(`${API_BASE}/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteBooking(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/bookings/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Forecast
  async getForecast(
    tripId: string
  ): Promise<{ success: boolean; forecast: FinancialForecastBreakdown; obligations: any[] }> {
    const res = await fetch(`${API_BASE}/forecast/trip/${tripId}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Recovery
  async generateRecovery(tripId: string): Promise<{
    success: boolean;
    recoveryRun: RecoveryRun;
    strategies: RecoveryStrategyResult[];
    isInfeasible: boolean;
    infeasibilityReason?: string;
  }> {
    const res = await fetch(`${API_BASE}/recovery/trip/${tripId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getRecoveryRuns(tripId: string): Promise<{ success: boolean; runs: RecoveryRun[] }> {
    const res = await fetch(`${API_BASE}/recovery/trip/${tripId}/runs`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async approveRecovery(
    tripId: string,
    runId: string,
    strategyType: string,
    approvalNotes?: string
  ): Promise<{
    success: boolean;
    message: string;
    approvedRun: RecoveryRun;
    newVersion: number;
    updatedForecast: FinancialForecastBreakdown;
  }> {
    const res = await fetch(`${API_BASE}/recovery/trip/${tripId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ runId, strategyType, approvalNotes }),
    });
    return handleResponse(res);
  },

  async rejectRecovery(
    tripId: string,
    runId: string,
    rejectionReason?: string
  ): Promise<{ success: boolean; message: string; recoveryRun: RecoveryRun }> {
    const res = await fetch(`${API_BASE}/recovery/trip/${tripId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ runId, rejectionReason }),
    });
    return handleResponse(res);
  },

  // Ledger
  async getLedger(tripId: string): Promise<{
    success: boolean;
    currentVersion: number;
    runs: RecoveryRun[];
    auditEvents: AuditEvent[];
  }> {
    const res = await fetch(`${API_BASE}/ledger/trip/${tripId}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Simulator
  async evaluateSimulation(
    tripId: string,
    adjustments: any[]
  ): Promise<{
    success: boolean;
    simulationNotice: string;
    originalForecast: FinancialForecastBreakdown;
    simulatedForecast: FinancialForecastBreakdown;
    netDeltaMinor: number;
    isSavings: boolean;
    adjustedItemsCount: number;
  }> {
    const res = await fetch(`${API_BASE}/simulator/trip/${tripId}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ adjustments }),
    });
    return handleResponse(res);
  },

  // Analytics
  async getAnalytics(tripId: string): Promise<{
    success: boolean;
    forecast: FinancialForecastBreakdown;
    categoryBreakdown: any[];
    dailyTrend: any[];
    recoverySavingsMinor: number;
    currentVersion: number;
    hasApprovedRecovery: boolean;
  }> {
    const res = await fetch(`${API_BASE}/analytics/trip/${tripId}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Copilot
  async askCopilot(
    tripId: string,
    message: string
  ): Promise<{
    success: boolean;
    response: {
      answer: string;
      suggestedFollowUps: string[];
      source: 'GEMINI_AI' | 'DETERMINISTIC_FALLBACK';
    };
  }> {
    const res = await fetch(`${API_BASE}/copilot/trip/${tripId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ message }),
    });
    return handleResponse(res);
  },
};

