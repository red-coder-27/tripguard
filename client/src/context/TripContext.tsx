import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Trip, FinancialForecastBreakdown } from '../types/index.js';
import { api } from '../services/api.js';
import { useAuth } from './AuthContext.js';

interface TripContextType {
  trips: Trip[];
  activeTrip: Trip | null;
  forecast: FinancialForecastBreakdown | null;
  isLoading: boolean;
  setActiveTripId: (id: string) => void;
  refreshTrips: () => Promise<void>;
  refreshActiveTrip: () => Promise<void>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export const TripProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [forecast, setForecast] = useState<FinancialForecastBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshTrips = useCallback(async () => {
    if (!isAuthenticated) {
      setTrips([]);
      setActiveTrip(null);
      setForecast(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.getTrips();
      setTrips(res.trips);

      // Maintain active trip or default to first
      if (res.trips.length > 0) {
        const storedActiveId = localStorage.getItem('tripguard_active_trip_id');
        const matched = res.trips.find((t) => t._id === storedActiveId) || res.trips[0];
        setActiveTrip(matched);
        if (matched.forecast) {
          setForecast(matched.forecast);
        }
      } else {
        setActiveTrip(null);
        setForecast(null);
      }
    } catch (err) {
      console.error('[TripContext] Failed to load trips:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const refreshActiveTrip = useCallback(async () => {
    if (!activeTrip) return;
    try {
      const [tripRes, forecastRes] = await Promise.all([
        api.getTrip(activeTrip._id),
        api.getForecast(activeTrip._id),
      ]);
      setActiveTrip(tripRes.trip);
      setForecast(forecastRes.forecast);
    } catch (err) {
      console.error('[TripContext] Failed to refresh active trip:', err);
    }
  }, [activeTrip]);

  useEffect(() => {
    refreshTrips();
  }, [refreshTrips]);

  const setActiveTripId = (id: string) => {
    const found = trips.find((t) => t._id === id);
    if (found) {
      setActiveTrip(found);
      localStorage.setItem('tripguard_active_trip_id', id);
      if (found.forecast) {
        setForecast(found.forecast);
      } else {
        setForecast(null); // Clear previous trip's forecast immediately to prevent stale numbers
        api.getForecast(found._id).then((res) => {
          setActiveTrip((current) => {
            if (current?._id === id) {
              setForecast(res.forecast);
            }
            return current;
          });
        });
      }
    }
  };

  return (
    <TripContext.Provider
      value={{
        trips,
        activeTrip,
        forecast,
        isLoading,
        setActiveTripId,
        refreshTrips,
        refreshActiveTrip,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = () => {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used within a TripProvider');
  return ctx;
};

