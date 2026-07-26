-- TRIP Migration 0009: Airports & Master Data (OurAirports / OPTD Open Data)

CREATE TABLE IF NOT EXISTS airports (
    iata_code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    country_code TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO airports (iata_code, name, city, country_code, lat, lng) VALUES
('CDG', 'Charles de Gaulle Airport', 'Paris', 'FR', 49.0097, 2.5479),
('ORY', 'Paris Orly Airport', 'Paris', 'FR', 48.7262, 2.3652),
('HER', 'Heraklion International Airport', 'Heraklion (Crete)', 'GR', 35.3397, 25.1803),
('CHQ', 'Chania International Airport', 'Chania (Crete)', 'GR', 35.5317, 24.1497),
('CPH', 'Copenhagen Airport', 'Copenhagen', 'DK', 55.6180, 12.6508),
('JFK', 'John F. Kennedy International Airport', 'New York', 'US', 40.6413, -73.7781),
('LHR', 'London Heathrow Airport', 'London', 'GB', 51.4700, -0.4543),
('HND', 'Tokyo Haneda Airport', 'Tokyo', 'JP', 35.5494, 139.7798),
('SYD', 'Sydney Kingsford Smith Airport', 'Sydney', 'AU', -33.9461, 151.1772),
('ARN', 'Stockholm Arlanda Airport', 'Stockholm', 'SE', 59.6498, 17.9238);
