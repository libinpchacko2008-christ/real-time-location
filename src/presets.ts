import { SimulationRoutePreset } from './types';

export const SIMULATION_PRESETS: SimulationRoutePreset[] = [
  {
    id: 'delhi-heritage',
    name: 'New Delhi Rajpath Tour',
    description: 'A spectacular historical route from the majestic India Gate, running along Kartavya Path (Rajpath) to the Rashtrapati Bhavan, New Delhi.',
    travelMode: 'walk',
    speedKmh: 5.5,
    coordinates: [
      [28.6129, 77.2295], // India Gate
      [28.6125, 77.2210], // National War Memorial
      [28.6122, 77.2140], // Rajpath/Kartavya Path Middle
      [28.6120, 77.2055], // Vijay Chowk
      [28.6143, 77.2007], // Rashtrapati Bhavan (President's House)
      [28.6129, 77.2295]  // Loop back
    ]
  },
  {
    id: 'mumbai-marine-drive',
    name: 'Mumbai Marine Drive Promenade',
    description: 'An iconic coastal simulation along Netaji Subhash Chandra Bose Road (Marine Drive), starting from Nariman Point up to Girgaon Chowpatty, Mumbai.',
    travelMode: 'bike',
    speedKmh: 18,
    coordinates: [
      [18.9255, 72.8205], // Nariman Point
      [18.9325, 72.8190], // Marine Drive Flyover
      [18.9405, 72.8175], // Wankhede Stadium Side
      [18.9485, 72.8150], // Charni Road Area
      [18.9540, 72.8115], // Girgaon Chowpatty
      [18.9485, 72.8150],
      [18.9255, 72.8205]  // Loop back
    ]
  },
  {
    id: 'sf-marina',
    name: 'San Francisco Waterfront Ride',
    description: 'A beautiful coastal cycling route starting near the Golden Gate Bridge, moving through Crissy Field to the Marina Green.',
    travelMode: 'bike',
    speedKmh: 22,
    coordinates: [
      [37.8077, -122.4750], // Golden Gate View Point
      [37.8062, -122.4695],
      [37.8050, -122.4635], // Crissy Field East Beach
      [37.8048, -122.4570],
      [37.8058, -122.4490], // Crissy Field Marsh
      [37.8065, -122.4410], // Marina Green
      [37.8055, -122.4350], // Yacht Harbor
      [37.8040, -122.4345], // Fort Mason Edge
      [37.8065, -122.4410], // Yacht Harbor loop back
      [37.8077, -122.4750], // Start Point
    ]
  },
  {
    id: 'monaco-gp',
    name: 'Monaco GP Formula Circuit',
    description: 'A high-speed driving tour following the iconic Formula 1 street race track through Monte Carlo, around the famous harbor.',
    travelMode: 'drive',
    speedKmh: 120,
    coordinates: [
      [43.7371, 7.4273], // Pit Lane/Start-Finish
      [43.7375, 7.4290], // Sainte Devote (Turn 1)
      [43.7398, 7.4285], // Beau Rivage climb
      [43.7420, 7.4276], // Massenet
      [43.7421, 7.4258], // Casino Square
      [43.7405, 7.4251], // Mirabeau Haute
      [43.7397, 7.4262], // Grand Hotel Hairpin (slowest turn)
      [43.7388, 7.4268], // Mirabeau Bas
      [43.7383, 7.4284], // Portier (leading to tunnel)
      [43.7394, 7.4320], // Entering Tunnel
      [43.7385, 7.4328], // Tunnel exit speed section
      [43.7369, 7.4298], // Nouvelle Chicane
      [43.7358, 7.4289], // Tabac
      [43.7350, 7.4281], // Louis Chiron
      [43.7345, 7.4275], // Swimming Pool Entrance
      [43.7349, 7.4257], // Rascasse
      [43.7358, 7.4259], // Anthony Noghes
      [43.7371, 7.4273]  // Return to Start-Finish
    ]
  },
  {
    id: 'paris-seine',
    name: 'Paris Seine Romantic Walk',
    description: 'A leisurely walking tour along the Seine River banks, starting at the Eiffel Tower, passing Les Invalides to Musée d\'Orsay.',
    travelMode: 'walk',
    speedKmh: 5,
    coordinates: [
      [48.8584, 2.2945], // Eiffel Tower
      [48.8615, 2.2985], // Pont d'Iéna
      [48.8624, 2.3040], // Port de la Bourdonnais
      [48.8631, 2.3125], // Pont de l'Alma
      [48.8633, 2.3135], // Passerelle Debilly
      [48.8629, 2.3182], // Pont Alexandre III (most beautiful bridge)
      [48.8617, 2.3250], // Musée d'Orsay
      [48.8598, 2.3320], // Pont Royal
      [48.8580, 2.3385], // Pont des Arts
      [48.8584, 2.2945]  // Back to Eiffel Tower (Simulation loops)
    ]
  },
  {
    id: 'tokyo-shibuya',
    name: 'Tokyo Shibuya Walkway',
    description: 'Navigate the bustling neon streets of Shibuya, crossing the famous Scramble, heading up Miyashita Park and Harajuku.',
    travelMode: 'walk',
    speedKmh: 6,
    coordinates: [
      [35.6585, 139.7013], // Shibuya Scramble Crossing
      [35.6598, 139.7008], // Shibuya 109
      [35.6619, 139.7000], // Seibu Shibuya
      [35.6625, 139.7018], // Miyashita Park
      [35.6650, 139.7035], // Cat Street Entrance
      [35.6675, 139.7050], // Harajuku Omotesando Intersection
      [35.6701, 139.7026], // Takeshita Street End
      [35.6690, 139.7015], // Meiji Jingu Entrance
      [35.6585, 139.7013]  // Loop back to Shibuya Station
    ]
  },
  {
    id: 'chicago-lakefront',
    name: 'Chicago Lakefront Path Jog',
    description: 'A scenic jogging simulation along the coast of Lake Michigan, tracking past Navy Pier and Grant Park.',
    travelMode: 'bike',
    speedKmh: 12,
    coordinates: [
      [41.8916, -87.6080], // Navy Pier Entrance
      [41.8885, -87.6110], // DuSable Harbor
      [41.8840, -87.6105], // Columbia Yacht Club
      [41.8805, -87.6088], // Monroe Harbor Walkway
      [41.8758, -87.6100], // Buckingham Fountain Outer Ring
      [41.8670, -87.6120], // Museum Campus Beach
      [41.8625, -87.6145], // Adler Planetarium Loop
      [41.8916, -87.6080]  // Loop Back
    ]
  }
];

export const TRAVEL_MODE_METADATA = {
  walk: {
    label: 'Walking',
    icon: 'Footprints',
    maxSpeedKmh: 8,
    typicalKcalPerKm: 65,
    iconColor: 'text-amber-400',
  },
  bike: {
    label: 'Cycling',
    icon: 'Bike',
    maxSpeedKmh: 45,
    typicalKcalPerKm: 35,
    iconColor: 'text-emerald-400',
  },
  drive: {
    label: 'Driving',
    icon: 'Car',
    maxSpeedKmh: 240,
    typicalKcalPerKm: 0,
    iconColor: 'text-sky-400',
  }
};
