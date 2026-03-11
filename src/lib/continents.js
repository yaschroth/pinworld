// Major cities mapped to their country (for when location_name doesn't include country)
const cityToCountry = {
  'Rio de Janeiro': 'Brazil',
  'Copacabana': 'Brazil',
  'Ipanema': 'Brazil',
  'São Paulo': 'Brazil',
  'Brasília': 'Brazil',
  'Salvador': 'Brazil',
  'New York': 'United States',
  'Los Angeles': 'United States',
  'Chicago': 'United States',
  'Miami': 'United States',
  'San Francisco': 'United States',
  'Las Vegas': 'United States',
  'Paris': 'France',
  'Nice': 'France',
  'Lyon': 'France',
  'London': 'United Kingdom',
  'Manchester': 'United Kingdom',
  'Edinburgh': 'United Kingdom',
  'Rome': 'Italy',
  'Venice': 'Italy',
  'Florence': 'Italy',
  'Milan': 'Italy',
  'Naples': 'Italy',
  'Pisa': 'Italy',
  'Bologna': 'Italy',
  'Turin': 'Italy',
  'Verona': 'Italy',
  'Genoa': 'Italy',
  'Barcelona': 'Spain',
  'Madrid': 'Spain',
  'Seville': 'Spain',
  'Valencia': 'Spain',
  'Berlin': 'Germany',
  'Munich': 'Germany',
  'Hamburg': 'Germany',
  'Frankfurt': 'Germany',
  'Amsterdam': 'Netherlands',
  'Rotterdam': 'Netherlands',
  'Tokyo': 'Japan',
  'Kyoto': 'Japan',
  'Osaka': 'Japan',
  'Sydney': 'Australia',
  'Melbourne': 'Australia',
  'Brisbane': 'Australia',
  'Bangkok': 'Thailand',
  'Phuket': 'Thailand',
  'Dubai': 'United Arab Emirates',
  'Abu Dhabi': 'United Arab Emirates',
  'Singapore': 'Singapore',
  'Hong Kong': 'China',
  'Shanghai': 'China',
  'Beijing': 'China',
  'Mumbai': 'India',
  'Delhi': 'India',
  'Goa': 'India',
  'Cairo': 'Egypt',
  'Marrakech': 'Morocco',
  'Cape Town': 'South Africa',
  'Lisbon': 'Portugal',
  'Porto': 'Portugal',
  'Athens': 'Greece',
  'Santorini': 'Greece',
  'Prague': 'Czech Republic',
  'Vienna': 'Austria',
  'Zurich': 'Switzerland',
  'Geneva': 'Switzerland',
  'Brussels': 'Belgium',
  'Dublin': 'Ireland',
  'Stockholm': 'Sweden',
  'Copenhagen': 'Denmark',
  'Oslo': 'Norway',
  'Helsinki': 'Finland',
  'Budapest': 'Hungary',
  'Warsaw': 'Poland',
  'Krakow': 'Poland',
  'Moscow': 'Russia',
  'St. Petersburg': 'Russia',
  'Istanbul': 'Turkey',
  'Cancun': 'Mexico',
  'Mexico City': 'Mexico',
  'Buenos Aires': 'Argentina',
  'Lima': 'Peru',
  'Bogota': 'Colombia',
  'Santiago': 'Chile',
  'Havana': 'Cuba',
  'Auckland': 'New Zealand',
  'Queenstown': 'New Zealand',
  'Bali': 'Indonesia',
  'Jakarta': 'Indonesia',
  'Seoul': 'South Korea',
  'Taipei': 'Taiwan',
  'Hanoi': 'Vietnam',
  'Ho Chi Minh City': 'Vietnam'
}

// Mapping of countries to continents
const countryToContinent = {
  // Africa
  'Algeria': 'Africa', 'Angola': 'Africa', 'Benin': 'Africa', 'Botswana': 'Africa',
  'Burkina Faso': 'Africa', 'Burundi': 'Africa', 'Cameroon': 'Africa', 'Cape Verde': 'Africa',
  'Central African Republic': 'Africa', 'Chad': 'Africa', 'Comoros': 'Africa', 'Congo': 'Africa',
  'Democratic Republic of the Congo': 'Africa', 'Djibouti': 'Africa', 'Egypt': 'Africa',
  'Equatorial Guinea': 'Africa', 'Eritrea': 'Africa', 'Eswatini': 'Africa', 'Ethiopia': 'Africa',
  'Gabon': 'Africa', 'Gambia': 'Africa', 'Ghana': 'Africa', 'Guinea': 'Africa',
  'Guinea-Bissau': 'Africa', 'Ivory Coast': 'Africa', "Côte d'Ivoire": 'Africa', 'Kenya': 'Africa',
  'Lesotho': 'Africa', 'Liberia': 'Africa', 'Libya': 'Africa', 'Madagascar': 'Africa',
  'Malawi': 'Africa', 'Mali': 'Africa', 'Mauritania': 'Africa', 'Mauritius': 'Africa',
  'Morocco': 'Africa', 'Mozambique': 'Africa', 'Namibia': 'Africa', 'Niger': 'Africa',
  'Nigeria': 'Africa', 'Rwanda': 'Africa', 'São Tomé and Príncipe': 'Africa', 'Senegal': 'Africa',
  'Seychelles': 'Africa', 'Sierra Leone': 'Africa', 'Somalia': 'Africa', 'South Africa': 'Africa',
  'South Sudan': 'Africa', 'Sudan': 'Africa', 'Tanzania': 'Africa', 'Togo': 'Africa',
  'Tunisia': 'Africa', 'Uganda': 'Africa', 'Zambia': 'Africa', 'Zimbabwe': 'Africa',

  // Asia
  'Afghanistan': 'Asia', 'Armenia': 'Asia', 'Azerbaijan': 'Asia', 'Bahrain': 'Asia',
  'Bangladesh': 'Asia', 'Bhutan': 'Asia', 'Brunei': 'Asia', 'Cambodia': 'Asia',
  'China': 'Asia', 'Cyprus': 'Asia', 'Georgia': 'Asia', 'India': 'Asia', 'Indonesia': 'Asia',
  'Iran': 'Asia', 'Iraq': 'Asia', 'Israel': 'Asia', 'Japan': 'Asia', 'Jordan': 'Asia',
  'Kazakhstan': 'Asia', 'Kuwait': 'Asia', 'Kyrgyzstan': 'Asia', 'Laos': 'Asia', 'Lebanon': 'Asia',
  'Malaysia': 'Asia', 'Maldives': 'Asia', 'Mongolia': 'Asia', 'Myanmar': 'Asia', 'Nepal': 'Asia',
  'North Korea': 'Asia', 'Oman': 'Asia', 'Pakistan': 'Asia', 'Palestine': 'Asia',
  'Philippines': 'Asia', 'Qatar': 'Asia', 'Saudi Arabia': 'Asia', 'Singapore': 'Asia',
  'South Korea': 'Asia', 'Sri Lanka': 'Asia', 'Syria': 'Asia', 'Taiwan': 'Asia',
  'Tajikistan': 'Asia', 'Thailand': 'Asia', 'Timor-Leste': 'Asia', 'Turkey': 'Asia',
  'Turkmenistan': 'Asia', 'United Arab Emirates': 'Asia', 'Uzbekistan': 'Asia',
  'Vietnam': 'Asia', 'Yemen': 'Asia',

  // Europe
  'Albania': 'Europe', 'Andorra': 'Europe', 'Austria': 'Europe', 'Belarus': 'Europe',
  'Belgium': 'Europe', 'Bosnia and Herzegovina': 'Europe', 'Bulgaria': 'Europe',
  'Croatia': 'Europe', 'Czech Republic': 'Europe', 'Czechia': 'Europe', 'Denmark': 'Europe',
  'Estonia': 'Europe', 'Finland': 'Europe', 'France': 'Europe', 'Germany': 'Europe',
  'Greece': 'Europe', 'Hungary': 'Europe', 'Iceland': 'Europe', 'Ireland': 'Europe',
  'Italy': 'Europe', 'Kosovo': 'Europe', 'Latvia': 'Europe', 'Liechtenstein': 'Europe',
  'Lithuania': 'Europe', 'Luxembourg': 'Europe', 'Malta': 'Europe', 'Moldova': 'Europe',
  'Monaco': 'Europe', 'Montenegro': 'Europe', 'Netherlands': 'Europe', 'North Macedonia': 'Europe',
  'Norway': 'Europe', 'Poland': 'Europe', 'Portugal': 'Europe', 'Romania': 'Europe',
  'Russia': 'Europe', 'San Marino': 'Europe', 'Serbia': 'Europe', 'Slovakia': 'Europe',
  'Slovenia': 'Europe', 'Spain': 'Europe', 'Sweden': 'Europe', 'Switzerland': 'Europe',
  'Ukraine': 'Europe', 'United Kingdom': 'Europe', 'Vatican City': 'Europe',

  // North America
  'Antigua and Barbuda': 'North America', 'Bahamas': 'North America', 'Barbados': 'North America',
  'Belize': 'North America', 'Canada': 'North America', 'Costa Rica': 'North America',
  'Cuba': 'North America', 'Dominica': 'North America', 'Dominican Republic': 'North America',
  'El Salvador': 'North America', 'Grenada': 'North America', 'Guatemala': 'North America',
  'Haiti': 'North America', 'Honduras': 'North America', 'Jamaica': 'North America',
  'Mexico': 'North America', 'Nicaragua': 'North America', 'Panama': 'North America',
  'Saint Kitts and Nevis': 'North America', 'Saint Lucia': 'North America',
  'Saint Vincent and the Grenadines': 'North America', 'Trinidad and Tobago': 'North America',
  'United States': 'North America', 'United States of America': 'North America', 'USA': 'North America',

  // South America
  'Argentina': 'South America', 'Bolivia': 'South America', 'Brazil': 'South America',
  'Chile': 'South America', 'Colombia': 'South America', 'Ecuador': 'South America',
  'Guyana': 'South America', 'Paraguay': 'South America', 'Peru': 'South America',
  'Suriname': 'South America', 'Uruguay': 'South America', 'Venezuela': 'South America',

  // Oceania
  'Australia': 'Oceania', 'Fiji': 'Oceania', 'Kiribati': 'Oceania', 'Marshall Islands': 'Oceania',
  'Micronesia': 'Oceania', 'Nauru': 'Oceania', 'New Zealand': 'Oceania', 'Palau': 'Oceania',
  'Papua New Guinea': 'Oceania', 'Samoa': 'Oceania', 'Solomon Islands': 'Oceania',
  'Tonga': 'Oceania', 'Tuvalu': 'Oceania', 'Vanuatu': 'Oceania',
}

export function getContinent(country) {
  if (!country) return 'Unknown'

  // Try exact match first
  if (countryToContinent[country]) {
    return countryToContinent[country]
  }

  // Try partial match
  const countryLower = country.toLowerCase()
  for (const [key, continent] of Object.entries(countryToContinent)) {
    if (countryLower.includes(key.toLowerCase()) || key.toLowerCase().includes(countryLower)) {
      return continent
    }
  }

  return 'Unknown'
}

export function extractCountry(locationName) {
  if (!locationName) return 'Unknown'

  const parts = locationName.split(',').map(p => p.trim())

  // Check if ANY part is a known city (check all parts, not just first)
  for (const part of parts) {
    if (cityToCountry[part]) {
      return cityToCountry[part]
    }
    // Also check case-insensitive
    for (const [city, country] of Object.entries(cityToCountry)) {
      if (city.toLowerCase() === part.toLowerCase()) {
        return country
      }
    }
  }

  // If multiple parts and last part looks like a country, use it
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1]
    // Check if it's actually a country (in our countryToContinent map)
    if (countryToContinent[lastPart]) {
      return lastPart
    }
  }

  return 'Unknown'
}

export function groupPinsByLocation(pins, childFilterFn = null) {
  const grouped = {}

  // Separate parent pins (cities) and child pins (sights)
  const parentPins = pins.filter(pin => !pin.parent_id)
  const childPins = pins.filter(pin => pin.parent_id)

  // Create a map of parent_id to children
  const childrenByParent = {}
  childPins.forEach(child => {
    if (!childrenByParent[child.parent_id]) {
      childrenByParent[child.parent_id] = []
    }
    childrenByParent[child.parent_id].push(child)
  })

  parentPins.forEach(pin => {
    // Use the country field if available, otherwise extract from location_name
    const country = pin.country || extractCountry(pin.location_name)
    const continent = pin.continent || getContinent(country)

    if (!grouped[continent]) {
      grouped[continent] = {}
    }

    if (!grouped[continent][country]) {
      grouped[continent][country] = []
    }

    // Get children and optionally filter them
    let children = childrenByParent[pin.id] || []
    if (childFilterFn && children.length > 0) {
      children = children.filter(childFilterFn)
    }

    // Add children (sights) to the pin
    const pinWithChildren = {
      ...pin,
      country,
      continent,
      children
    }

    grouped[continent][country].push(pinWithChildren)
  })

  // Sort continents and countries
  const sortedGrouped = {}
  Object.keys(grouped).sort().forEach(continent => {
    sortedGrouped[continent] = {}
    Object.keys(grouped[continent]).sort().forEach(country => {
      sortedGrouped[continent][country] = grouped[continent][country]
    })
  })

  return sortedGrouped
}
