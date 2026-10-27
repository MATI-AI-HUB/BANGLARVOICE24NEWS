'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';

type CurrentWeather = { temperature_2m?: number; relative_humidity_2m?: number };

export function WeatherWidget({ locale = 'bn' }: { locale?: Locale }) {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.search = new URLSearchParams({
          latitude: '23.8103',
          longitude: '90.4125',
          current: 'temperature_2m,relative_humidity_2m',
          timezone: 'Asia/Dhaka',
        }).toString();
        const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!response.ok) throw new Error('weather_unavailable');
        const body = await response.json() as { current?: CurrentWeather };
        if (active && Number.isFinite(body.current?.temperature_2m)) setWeather(body.current || null);
      } catch {
        if (active) setWeather(null);
      }
    };
    void load();
    const timer = window.setInterval(load, 15 * 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (!weather) return null;
  const temperature = Math.round(weather.temperature_2m as number);
  const humidity = Number.isFinite(weather.relative_humidity_2m) ? Math.round(weather.relative_humidity_2m as number) : null;
  const digits = (value: number) => locale === 'bn' ? String(value).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]) : String(value);
  const label = locale === 'bn' ? 'ঢাকার আবহাওয়া' : 'Dhaka weather';
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-medium text-white/90 sm:text-xs" aria-label={label}>
      <span aria-hidden="true">☀</span>
      <span>{label}</span>
      <span>{digits(temperature)}°C</span>
      {humidity !== null ? <span className="hidden sm:inline">· {digits(humidity)}%</span> : null}
    </span>
  );
}
