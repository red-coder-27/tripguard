import React, { useEffect, useState } from 'react';
import {
  CloudRain,
  Sun,
  Cloud,
  AlertTriangle,
  Bell,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useTrip } from '../context/TripContext.js';
import { api } from '../services/api.js';

interface WeatherForecast {
  date: string;
  dayNumber: number;
  condition: string;
  tempMaxC: number;
  tempMinC: number;
  precipitationProbability: number;
  isOutdoorWarning: boolean;
  recommendation: string;
}

interface DisruptionAlert {
  id: string;
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'INFO';
  title: string;
  description: string;
  actionUrl?: string;
  actionText?: string;
  timestamp: string;
}

export const DisruptionsPage: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  const { activeTrip } = useTrip();
  const [weather, setWeather] = useState<WeatherForecast[]>([]);
  const [alerts, setAlerts] = useState<DisruptionAlert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!activeTrip) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [weatherRes, alertsRes] = await Promise.all([
          api.get<{ forecast: WeatherForecast[] }>(
            `/disruptions/trip/${activeTrip._id}/weather`
          ),
          api.get<DisruptionAlert[]>(
            `/disruptions/trip/${activeTrip._id}/alerts`
          ),
        ]);

        if (weatherRes.success && weatherRes.data) {
          setWeather(weatherRes.data.forecast);
        }
        if (alertsRes.success && alertsRes.data) {
          setAlerts(alertsRes.data);
        }
      } catch (err) {
        console.error('Failed to load disruption data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeTrip]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 border border-amber-200">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              Travel Disruption & Weather Intelligence
            </span>
            <span className="text-xs text-slate-500 font-medium">Open-Meteo REST</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Real-Time Trip Awareness & Alert Hub
          </h1>
          <p className="text-xs text-slate-500">
            {activeTrip?.name || 'Tokyo Autumn Discovery 2026'} • Active monitoring for meteorological risks, booking cancellation deadlines, and budget anomalies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Monitoring Active
          </span>
        </div>
      </div>

      {/* 7-Day Weather Grid */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              7-Day Meteorological Forecast — {activeTrip?.destination || 'Tokyo, Japan'}
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">Auto-updated via Open-Meteo API</span>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {weather.map((day) => {
              const isRain = day.isOutdoorWarning;

              return (
                <div
                  key={day.dayNumber}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                    isRain
                      ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Day {day.dayNumber}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{day.date.slice(5)}</span>
                    </div>

                    <div className="my-2 flex items-center gap-2">
                      {isRain ? (
                        <CloudRain className="w-6 h-6 text-blue-600" />
                      ) : day.precipitationProbability > 15 ? (
                        <Cloud className="w-6 h-6 text-slate-400" />
                      ) : (
                        <Sun className="w-6 h-6 text-amber-500" />
                      )}
                      <div>
                        <div className="text-sm font-black text-slate-900">
                          {day.tempMaxC}° <span className="text-xs font-normal text-slate-400">/ {day.tempMinC}°</span>
                        </div>
                        <div className="text-[10px] font-semibold text-slate-600">{day.condition}</div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <span className="font-semibold text-blue-700">Rain: {day.precipitationProbability}%</span>
                    </div>
                  </div>

                  {isRain && (
                    <div className="mt-2.5 pt-2 border-t border-blue-200 text-[10px] text-blue-900 font-medium">
                      ⚠️ Rain risk. Indoor sights recommended.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Notifications & Disruption Alerts */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Active Trip Alerts & Critical Milestones ({alerts.length})
            </h2>
          </div>
        </div>

        <div className="space-y-3">
          {alerts.map((alert) => {
            const isHigh = alert.severity === 'HIGH';
            const isMedium = alert.severity === 'MEDIUM';

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isHigh
                    ? 'border-red-200 bg-red-50/40'
                    : isMedium
                    ? 'border-amber-200 bg-amber-50/40'
                    : 'border-slate-200 bg-slate-50/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isHigh
                        ? 'bg-red-100 text-red-600'
                        : isMedium
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900">{alert.title}</h3>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          isHigh
                            ? 'bg-red-200 text-red-800'
                            : isMedium
                            ? 'bg-amber-200 text-amber-800'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                </div>

                {alert.actionUrl && onNavigate && (
                  <button
                    onClick={() => onNavigate(alert.actionUrl!)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg shrink-0 flex items-center gap-1 shadow-sm transition-colors ${
                      isHigh
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : isMedium
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {alert.actionText || 'Take Action'} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
