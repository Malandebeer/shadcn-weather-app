"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  MapPin,
  Wind,
  Droplets,
  Gauge,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudFog,
  CloudLightning,
  CloudDrizzle,
  RefreshCw,
  LocateFixed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Open-Meteo WMO Weather interpretation codes
const weatherCodeMap: Record<
  number,
  { label: string; icon: React.ElementType; color: string }
> = {
  0: { label: "Clear sky", icon: Sun, color: "text-yellow-400" },
  1: { label: "Mainly clear", icon: Sun, color: "text-yellow-400" },
  2: { label: "Partly cloudy", icon: Cloud, color: "text-sky-300" },
  3: { label: "Overcast", icon: Cloud, color: "text-slate-400" },
  45: { label: "Fog", icon: CloudFog, color: "text-slate-400" },
  48: { label: "Depositing rime fog", icon: CloudFog, color: "text-slate-400" },
  51: { label: "Light drizzle", icon: CloudDrizzle, color: "text-blue-400" },
  53: { label: "Moderate drizzle", icon: CloudDrizzle, color: "text-blue-400" },
  55: { label: "Dense drizzle", icon: CloudDrizzle, color: "text-blue-500" },
  56: { label: "Light freezing drizzle", icon: CloudDrizzle, color: "text-cyan-400" },
  57: { label: "Dense freezing drizzle", icon: CloudDrizzle, color: "text-cyan-500" },
  61: { label: "Slight rain", icon: CloudRain, color: "text-blue-400" },
  63: { label: "Moderate rain", icon: CloudRain, color: "text-blue-500" },
  65: { label: "Heavy rain", icon: CloudRain, color: "text-blue-600" },
  66: { label: "Light freezing rain", icon: CloudRain, color: "text-cyan-400" },
  67: { label: "Heavy freezing rain", icon: CloudRain, color: "text-cyan-500" },
  71: { label: "Slight snow", icon: CloudSnow, color: "text-sky-200" },
  73: { label: "Moderate snow", icon: CloudSnow, color: "text-sky-300" },
  75: { label: "Heavy snow", icon: CloudSnow, color: "text-sky-100" },
  77: { label: "Snow grains", icon: CloudSnow, color: "text-sky-200" },
  80: { label: "Slight rain showers", icon: CloudRain, color: "text-blue-400" },
  81: { label: "Moderate rain showers", icon: CloudRain, color: "text-blue-500" },
  82: { label: "Violent rain showers", icon: CloudRain, color: "text-blue-600" },
  85: { label: "Slight snow showers", icon: CloudSnow, color: "text-sky-200" },
  86: { label: "Heavy snow showers", icon: CloudSnow, color: "text-sky-100" },
  95: { label: "Thunderstorm", icon: CloudLightning, color: "text-purple-400" },
  96: { label: "Thunderstorm with slight hail", icon: CloudLightning, color: "text-purple-500" },
  99: { label: "Thunderstorm with heavy hail", icon: CloudLightning, color: "text-purple-600" },
};

function getWeatherInfo(code: number) {
  return weatherCodeMap[code] || { label: "Unknown", icon: Cloud, color: "text-slate-400" };
}

interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  country_code: string;
}

interface WeatherData {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    pressure_msl: number;
    cloud_cover: number;
    precipitation: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
    relative_humidity_2m: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
  };
  timezone: string;
}

const DEFAULT_LOCATION = {
  name: "Riversdale",
  admin1: "Western Cape",
  country: "South Africa",
  latitude: -34.09345,
  longitude: 21.25725,
};

export default function WeatherApp() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<"celsius" | "fahrenheit">("celsius");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWeather = useCallback(
    async (lat: number, lon: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          latitude: lat.toString(),
          longitude: lon.toString(),
          current:
            "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,cloud_cover,precipitation",
          hourly:
            "temperature_2m,weather_code,precipitation_probability,relative_humidity_2m",
          daily:
            "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
          timezone: "auto",
          temperature_unit: unit,
          wind_speed_unit: "kmh",
          forecast_days: "7",
        });

        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!res.ok) throw new Error("Failed to fetch weather data");
        const data = await res.json();
        setWeather(data);
        setLastUpdated(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [unit]
  );

  useEffect(() => {
    fetchWeather(location.latitude, location.longitude);
  }, [location.latitude, location.longitude, fetchWeather]);

  // Search geocoding
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            query
          )}&count=6&language=en&format=json`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setSuggestions(data.results || []);
        setShowSuggestions(true);
      } catch {
        // ignore abort
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const selectLocation = (place: GeoResult) => {
    setLocation({
      name: place.name,
      admin1: place.admin1 || "",
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setQuery("");
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({
          name: "Your location",
          admin1: "",
          country: "",
          latitude,
          longitude,
        });
      },
      () => {
        setError("Unable to get your location");
        setLoading(false);
      }
    );
  };

  const formatTemp = (t: number) => `${Math.round(t)}°`;

  const current = weather?.current;
  const weatherInfo = current ? getWeatherInfo(current.weather_code) : null;
  const WeatherIcon = weatherInfo?.icon || Cloud;

  // Filter hourly to next 24h from now
  const now = new Date();
  const hourlyItems =
    weather?.hourly.time
      .map((t, i) => ({
        time: t,
        temp: weather.hourly.temperature_2m[i],
        code: weather.hourly.weather_code[i],
        precip: weather.hourly.precipitation_probability[i],
        humidity: weather.hourly.relative_humidity_2m[i],
      }))
      .filter((h) => new Date(h.time) >= now)
      .slice(0, 24) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Header + Search */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Weather
              </h1>
              <p className="text-sm text-muted-foreground">
                Real-time data · Open-Meteo
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUnit(unit === "celsius" ? "fahrenheit" : "celsius")}
              >
                {unit === "celsius" ? "°C" : "°F"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchWeather(location.latitude, location.longitude)}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search city or town..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={handleGeolocate} title="Use my location">
                <LocateFixed className="h-4 w-4" />
              </Button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <Card className="absolute z-50 mt-1 w-full overflow-hidden shadow-lg">
                <ul className="max-h-64 overflow-auto py-1">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-accent"
                        onClick={() => selectLocation(s)}
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground">
                          {[s.admin1, s.country].filter(Boolean).join(", ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <Card className="mb-6 border-destructive/50 bg-destructive/10">
            <CardContent className="py-4 text-sm text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {loading && !weather ? (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : weather && current && weatherInfo ? (
          <>
            {/* Current Weather Card */}
            <Card className="mb-6 overflow-hidden border-0 bg-gradient-to-br from-card via-card to-muted/30 shadow-lg">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {location.name}
                        {location.admin1 ? `, ${location.admin1}` : ""}
                        {location.country ? `, ${location.country}` : ""}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-bold tracking-tighter sm:text-7xl">
                        {formatTemp(current.temperature_2m)}
                      </span>
                      <span className="text-2xl text-muted-foreground">
                        {unit === "celsius" ? "C" : "F"}
                      </span>
                    </div>
                    <p className="text-lg text-muted-foreground">
                      Feels like {formatTemp(current.apparent_temperature)}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="secondary" className="gap-1.5">
                        <WeatherIcon className={cn("h-3.5 w-3.5", weatherInfo.color)} />
                        {weatherInfo.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex justify-center sm:justify-end">
                    <WeatherIcon
                      className={cn("h-28 w-28 sm:h-32 sm:w-32", weatherInfo.color)}
                      strokeWidth={1.25}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card>
                <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
                  <Droplets className="h-5 w-5 text-blue-400" />
                  <span className="text-xs text-muted-foreground">Humidity</span>
                  <span className="text-lg font-semibold">
                    {current.relative_humidity_2m}%
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
                  <Wind className="h-5 w-5 text-sky-400" />
                  <span className="text-xs text-muted-foreground">Wind</span>
                  <span className="text-lg font-semibold">
                    {Math.round(current.wind_speed_10m)} km/h
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
                  <Gauge className="h-5 w-5 text-emerald-400" />
                  <span className="text-xs text-muted-foreground">Pressure</span>
                  <span className="text-lg font-semibold">
                    {Math.round(current.pressure_msl)} hPa
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center gap-1 p-4 text-center">
                  <Cloud className="h-5 w-5 text-slate-400" />
                  <span className="text-xs text-muted-foreground">Cloud cover</span>
                  <span className="text-lg font-semibold">{current.cloud_cover}%</span>
                </CardContent>
              </Card>
            </div>

            {/* Forecast Tabs */}
            <Tabs defaultValue="hourly" className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="hourly">Hourly</TabsTrigger>
                <TabsTrigger value="daily">7-Day</TabsTrigger>
              </TabsList>

              <TabsContent value="hourly" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Next 24 hours</CardTitle>
                    <CardDescription>Hourly forecast</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                      {hourlyItems.map((h) => {
                        const info = getWeatherInfo(h.code);
                        const Icon = info.icon;
                        const time = new Date(h.time);
                        const isNow =
                          Math.abs(time.getTime() - now.getTime()) < 45 * 60 * 1000;
                        return (
                          <div
                            key={h.time}
                            className={cn(
                              "flex min-w-[72px] flex-col items-center gap-1.5 rounded-lg border p-3",
                              isNow && "border-primary bg-primary/5"
                            )}
                          >
                            <span className="text-xs font-medium text-muted-foreground">
                              {isNow
                                ? "Now"
                                : time.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                            </span>
                            <Icon className={cn("h-6 w-6", info.color)} />
                            <span className="text-sm font-semibold">
                              {formatTemp(h.temp)}
                            </span>
                            {h.precip > 0 && (
                              <span className="text-[10px] text-blue-400">
                                {h.precip}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="daily" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">7-day forecast</CardTitle>
                    <CardDescription>Daily highs & lows</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {weather.daily.time.map((day, i) => {
                      const info = getWeatherInfo(weather.daily.weather_code[i]);
                      const Icon = info.icon;
                      const date = new Date(day);
                      const isToday =
                        date.toDateString() === now.toDateString();
                      return (
                        <div key={day}>
                          <div className="flex items-center gap-3 py-2.5">
                            <span className="w-20 text-sm font-medium">
                              {isToday
                                ? "Today"
                                : date.toLocaleDateString([], {
                                    weekday: "short",
                                  })}
                            </span>
                            <Icon className={cn("h-5 w-5 shrink-0", info.color)} />
                            <span className="hidden flex-1 text-sm text-muted-foreground sm:block">
                              {info.label}
                            </span>
                            <div className="ml-auto flex items-center gap-3 text-sm">
                              {weather.daily.precipitation_probability_max[i] >
                                0 && (
                                <span className="flex items-center gap-1 text-xs text-blue-400">
                                  <Droplets className="h-3 w-3" />
                                  {weather.daily.precipitation_probability_max[i]}%
                                </span>
                              )}
                              <span className="w-10 text-right font-medium text-muted-foreground">
                                {formatTemp(weather.daily.temperature_2m_min[i])}
                              </span>
                              <span className="w-10 text-right font-semibold">
                                {formatTemp(weather.daily.temperature_2m_max[i])}
                              </span>
                            </div>
                          </div>
                          {i < weather.daily.time.length - 1 && (
                            <Separator />
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Footer / Sources */}
            <div className="mt-8 space-y-2 text-center text-xs text-muted-foreground">
              <p>
                Data provided by{" "}
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2 hover:text-foreground"
                >
                  Open-Meteo
                </a>{" "}· Free & open-source weather API
              </p>
              <p>
                Models: ECMWF, ICON, GFS & more · Updated hourly
                {lastUpdated && (
                  <> · Last refreshed {lastUpdated.toLocaleTimeString()}</>
                )}
              </p>
              <p className="pt-1">
                Built with{" "}
                <span className="font-medium text-foreground">shadcn/ui</span> +
                Next.js · Heavy component usage
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
