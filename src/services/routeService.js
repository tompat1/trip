// OpenRouteService & OpenStreetMap Directions Integration for TRIP

export async function fetchRouteDirections(startCoords, endCoords, profile = 'foot-walking') {
  if (!startCoords || !endCoords) return null;
  const [startLat, startLng] = startCoords;
  const [endLat, endLng] = endCoords;

  try {
    // OpenRouteService REST Endpoint
    const url = `https://api.openrouteservice.org/v2/directions/${profile}?start=${startLng},${startLat}&end=${endLng},${endLat}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json, application/geo+json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const segment = data.features?.[0]?.properties?.segments?.[0];
      if (segment) {
        return {
          distanceMeters: Math.round(segment.distance),
          durationSeconds: Math.round(segment.duration),
          durationText: formatDurationText(segment.duration),
          distanceText: segment.distance >= 1000 ? `${(segment.distance / 1000).toFixed(1)} km` : `${Math.round(segment.distance)} m`,
          coordinates: data.features[0].geometry.coordinates.map(c => [c[1], c[0]])
        };
      }
    }
  } catch (err) {
    console.warn("OpenRouteService API offline or unauthenticated, falling back to direct line calculation:", err);
  }

  // Graceful Fallback: Direct Haversine calculation
  return calculateDirectRouteFallback(startCoords, endCoords, profile);
}

function formatDurationText(seconds) {
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins} min walk`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hrs}h ${remainingMins}m`;
}

function calculateDirectRouteFallback(startCoords, endCoords, profile) {
  const [lat1, lng1] = startCoords;
  const [lat2, lng2] = endCoords;

  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distanceMeters = Math.round(R * c);

  // Speed: walking approx 4.8 km/h (80 m/min), driving 30 km/h (500 m/min)
  const speedMetersPerMin = profile.includes('driving') ? 500 : 80;
  const mins = Math.ceil(distanceMeters / speedMetersPerMin);

  return {
    distanceMeters,
    durationSeconds: mins * 60,
    durationText: mins < 60 ? `${mins} min` : `${Math.floor(mins/60)}h ${mins%60}m`,
    distanceText: distanceMeters >= 1000 ? `${(distanceMeters/1000).toFixed(1)} km` : `${distanceMeters} m`,
    coordinates: [startCoords, endCoords]
  };
}
