// Shared constants across the app

export const CATEGORIES = [
  { value: 'general', label: 'General', icon: '📍' },
  { value: 'food', label: 'Food & Dining', icon: '🍽️' },
  { value: 'nature', label: 'Nature & Parks', icon: '🌲' },
  { value: 'hotel', label: 'Hotels & Stays', icon: '🏨' },
  { value: 'beach', label: 'Beach & Water', icon: '🏖️' },
  { value: 'culture', label: 'Culture & Museums', icon: '🏛️' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'nightlife', label: 'Nightlife', icon: '🌙' }
]

export const SOURCE_TYPES = ['Instagram', 'TikTok', 'YouTube', 'News', 'Other']

// Map location types (from extraction) to categories
export const LOCATION_TYPE_TO_CATEGORY = {
  // Culture & Museums
  'attraction': 'culture',
  'museum': 'culture',
  'monument': 'culture',
  'landmark': 'culture',
  'church': 'culture',
  'temple': 'culture',
  'palace': 'culture',
  'castle': 'culture',
  'ruins': 'culture',
  'gallery': 'culture',
  'theater': 'culture',
  'historic': 'culture',

  // Food & Dining
  'restaurant': 'food',
  'cafe': 'food',
  'bakery': 'food',
  'market': 'food',
  'food': 'food',

  // Hotels & Stays
  'hotel': 'hotel',
  'hostel': 'hotel',
  'resort': 'hotel',
  'accommodation': 'hotel',

  // Beach & Water
  'beach': 'beach',
  'lake': 'beach',
  'waterfall': 'beach',
  'pool': 'beach',

  // Nature & Parks
  'park': 'nature',
  'garden': 'nature',
  'mountain': 'nature',
  'forest': 'nature',
  'nature': 'nature',
  'viewpoint': 'nature',
  'hiking': 'nature',

  // Shopping
  'shop': 'shopping',
  'store': 'shopping',
  'mall': 'shopping',
  'shopping': 'shopping',
  'boutique': 'shopping',

  // Nightlife
  'bar': 'nightlife',
  'club': 'nightlife',
  'nightclub': 'nightlife',
  'lounge': 'nightlife',
  'pub': 'nightlife',

  // Default
  'city': 'general',
  'neighborhood': 'general',
  'other': 'general'
}

export function getCategoryFromLocationType(locationType) {
  if (!locationType) return 'general'
  return LOCATION_TYPE_TO_CATEGORY[locationType.toLowerCase()] || 'general'
}
