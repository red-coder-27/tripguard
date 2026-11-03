import { env } from '../config/env.js';

export interface CurrentWeatherReport {
  city: string;
  country?: string;
  tempC: number;
  feelsLikeC: number;
  tempMinC: number;
  tempMaxC: number;
  humidity: number;
  windSpeedMps: number;
  condition: string;
  description: string;
  weatherCode: number;
  retrievedAt: string;
  source: 'OPENWEATHER' | 'DETERMINISTIC_FALLBACK';
}

export interface DayForecastReport {
  date: string;
  dayNumber: number;
  tempMaxC: number;
  tempMinC: number;
  condition: string;
  description: string;
  precipitationProbability: number;
  isOutdoorWarning: boolean;
  recommendation: string;
}

export interface WeatherForecastResponse {
  city: string;
  retrievedAt: string;
  dailyForecasts: DayForecastReport[];
  source: 'OPENWEATHER' | 'DETERMINISTIC_FALLBACK';
}

const REQUEST_TIMEOUT_MS = 5000;

export class OpenWeatherProvider {
  private static get apiKey(): string | undefined {
    return env.OPENWEATHER_API_KEY;
  }

  /**
   * Fetch live current weather for given coordinates
   */
  static async getCurrentWeather(
    lat: number = 35.6895,
    lon: number = 139.6917
  ): Promise<CurrentWeatherReport> {
    const key = this.apiKey;
    const nowIso = new Date().toISOString();

    if (key) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = (await res.json()) as any;
          return {
            city: data.name || 'Tokyo',
            country: data.sys?.country || 'JP',
            tempC: Math.round(data.main?.temp ?? 19),
            feelsLikeC: Math.round(data.main?.feels_like ?? 19),
            tempMinC: Math.round(data.main?.temp_min ?? 15),
            tempMaxC: Math.round(data.main?.temp_max ?? 22),
            humidity: data.main?.humidity ?? 50,
            windSpeedMps: data.wind?.speed ?? 2.0,
            condition: data.weather?.[0]?.main || 'Clear',
            description: data.weather?.[0]?.description || 'clear sky',
            weatherCode: data.weather?.[0]?.id ?? 800,
            retrievedAt: nowIso,
            source: 'OPENWEATHER',
          };
        }
      } catch (err) {
        // Fallback
      }
    }

    // Deterministic realistic fallback
    return {
      city: 'Tokyo',
      country: 'JP',
      tempC: 19,
      feelsLikeC: 18,
      tempMinC: 14,
      tempMaxC: 22,
      humidity: 52,
      windSpeedMps: 2.2,
      condition: 'Clear',
      description: 'mild autumn clear skies',
      weatherCode: 800,
      retrievedAt: nowIso,
      source: 'DETERMINISTIC_FALLBACK',
    };
  }

  /**
   * Fetch 5-day / 7-day weather forecast
   */
  static async getForecast(
    lat: number = 35.6895,
    lon: number = 139.6917
  ): Promise<WeatherForecastResponse> {
    const key = this.apiKey;
    const nowIso = new Date().toISOString();

    if (key) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = (await res.json()) as any;
          const list = data.list || [];

          // Group by date
          const dateMap = new Map<string, any[]>();
          for (const item of list) {
            const dateStr = item.dt_txt?.split(' ')[0] || new Date(item.dt * 1000).toISOString().split('T')[0];
            if (!dateMap.has(dateStr)) {
              dateMap.set(dateStr, []);
            }
            dateMap.get(dateStr)!.push(item);
          }

          const dailyForecasts: DayForecastReport[] = [];
          let dayNum = 1;

          for (const [date, slots] of dateMap.entries()) {
            let maxT = -Infinity;
            let minT = Infinity;
            let maxPop = 0;
            let dominantDesc = slots[0]?.weather?.[0]?.description || 'clear';
            let dominantCond = slots[0]?.weather?.[0]?.main || 'Clear';

            for (const s of slots) {
              if (s.main?.temp_max > maxT) maxT = s.main.temp_max;
              if (s.main?.temp_min < minT) minT = s.main.temp_min;
              const pop = (s.pop ?? 0) * 100;
              if (pop > maxPop) maxPop = pop;
            }

            const isRain = maxPop >= 50 || dominantCond.toLowerCase().includes('rain');

            dailyForecasts.push({
              date,
              dayNumber: dayNum++,
              tempMaxC: Math.round(maxT === -Infinity ? 20 : maxT),
              tempMinC: Math.round(minT === Infinity ? 14 : minT),
              condition: dominantCond,
              description: dominantDesc,
              precipitationProbability: Math.round(maxPop),
              isOutdoorWarning: isRain,
              recommendation: isRain
                ? 'High precipitation forecast. Prioritize indoor activities (museums, malls, covered arcades).'
                : 'Favorable clear outdoor sightseeing conditions.',
            });
          }

          return {
            city: data.city?.name || 'Tokyo',
            retrievedAt: nowIso,
            dailyForecasts,
            source: 'OPENWEATHER',
          };
        }
      } catch (err) {
        // Fallback
      }
    }

    // Deterministic fallback
    const base = new Date();
    const fallbackDays: DayForecastReport[] = [
      {
        date: new Date(base.getTime() + 1 * 86400000).toISOString().split('T')[0],
        dayNumber: 1,
        tempMaxC: 21,
        tempMinC: 13,
        condition: 'Clear',
        description: 'crisp sunny sky',
        precipitationProbability: 10,
        isOutdoorWarning: false,
        recommendation: 'Perfect for observation decks and arrival walking tours.',
      },
      {
        date: new Date(base.getTime() + 2 * 86400000).toISOString().split('T')[0],
        dayNumber: 2,
        tempMaxC: 20,
        tempMinC: 14,
        condition: 'Clouds',
        description: 'scattered clouds',
        precipitationProbability: 15,
        isOutdoorWarning: false,
        recommendation: 'Comfortable mild weather for temple visits and street dining.',
      },
      {
        date: new Date(base.getTime() + 3 * 86400000).toISOString().split('T')[0],
        dayNumber: 3,
        tempMaxC: 16,
        tempMinC: 11,
        condition: 'Rain',
        description: 'moderate rain showers',
        precipitationProbability: 75,
        isOutdoorWarning: true,
        recommendation: 'Rain alert! Shift to covered sights (teamLab Planets, covered markets, indoor masterclasses).',
      },
      {
        date: new Date(base.getTime() + 4 * 86400000).toISOString().split('T')[0],
        dayNumber: 4,
        tempMaxC: 19,
        tempMinC: 12,
        condition: 'Clear',
        description: 'clear sky',
        precipitationProbability: 20,
        isOutdoorWarning: false,
        recommendation: 'Sky cleared. Ideal for Meiji Shrine forest and Akihabara tech exploration.',
      },
      {
        date: new Date(base.getTime() + 5 * 86400000).toISOString().split('T')[0],
        dayNumber: 5,
        tempMaxC: 22,
        tempMinC: 13,
        condition: 'Clear',
        description: 'sunny breeze',
        precipitationProbability: 5,
        isOutdoorWarning: false,
        recommendation: 'Warm pleasant conditions across Tokyo transit grid.',
      },
    ];

    return {
      city: 'Tokyo',
      retrievedAt: nowIso,
      dailyForecasts: fallbackDays,
      source: 'DETERMINISTIC_FALLBACK',
    };
  }
}

