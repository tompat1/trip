export async function fetchOpenMeteoWeather(lat = 48.8566, lng = 2.3522) {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lat);
    url.searchParams.set("longitude", lng);
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m");
    url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
    url.searchParams.set("forecast_days", "5");
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Open-Meteo request failed");

    const data = await res.json();
    const current = data.current || {};
    const daily = data.daily || {};

    const code = Number(current.weather_code ?? 0);
    const weatherMeta = getWeatherCodeMeta(code);

    const forecast = (daily.time || []).slice(0, 5).map((t, idx) => {
      const dCode = Number((daily.weather_code || [])[idx] ?? 0);
      const dayName = idx === 0 ? "Today" : new Intl.DateTimeFormat([], { weekday: "short" }).format(new Date(`${t}T12:00:00`));
      const meta = getWeatherCodeMeta(dCode);
      return {
        day: dayName,
        date: t,
        temp: `${Math.round((daily.temperature_2m_max || [])[idx] ?? 0)}°`,
        minTemp: `${Math.round((daily.temperature_2m_min || [])[idx] ?? 0)}°`,
        condition: meta.label,
        icon: meta.icon
      };
    });

    return {
      status: "ready",
      temp: `${Math.round(current.temperature_2m ?? 20)}°C`,
      feelsLike: `${Math.round(current.apparent_temperature ?? current.temperature_2m ?? 20)}°C`,
      humidity: `${current.relative_humidity_2m ?? 50}%`,
      windSpeed: `${Math.round(current.wind_speed_10m ?? 0)} km/h`,
      rain: current.rain ?? current.precipitation ?? 0,
      condition: weatherMeta.label,
      icon: weatherMeta.icon,
      isDay: Boolean(current.is_day),
      forecast,
      updatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.warn("Open-Meteo polling fallback:", err);
    return null;
  }
}

export function getWeatherCodeMeta(code) {
  if (code === 0) return { label: "Clear", icon: "☀️" };
  if ([1, 2].includes(code)) return { label: "Partly Cloudy", icon: "⛅" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if ([45, 48].includes(code)) return { label: "Foggy", icon: "🌫️" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { label: "Rainy", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "Snowy", icon: "❄️" };
  if (code >= 95) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "Fair", icon: "🌤️" };
}
