export const NIGERIA_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

export const AGRO_HUBS = {
  Kano: ['Dawanau Grain Market', 'Kura Aggregation Hub'],
  Oyo: ['Bodija Trade Corridor', 'Iseyin Farmgate Hub', 'Saki Produce Belt'],
  Benue: ['Gboko Yam Terminal', 'Makurdi Grain Cluster'],
  Kaduna: ['Zaria Soybean Hub', 'Sabon Tasha Silo'],
  Lagos: ['Ikeja Processing Mill', 'Apapa Export Gate'],
  Ogun: ['Ijebu-Ife Farmgate', 'Sagamu Haulage Yard'],
  Niger: ['Bida Rice Cluster', 'Minna Aggregation Point'],
  Plateau: ['Jos Highland Produce', 'Bukuru Silo'],
  'FCT - Abuja': ['Kuje Agro Terminal', 'Gwagwalada Market'],
  Enugu: ['Ogbete Produce Hub', 'Nsukka Farmgate'],
}

export const CATEGORY_META = {
  vegetables: { label: 'Vegetables', icon: '\u{1F96C}', blurb: 'Leafy and fruiting produce for daily markets.' },
  fruits: { label: 'Fruits', icon: '\u{1F34E}', blurb: 'Orchard and plantation fruit lots.' },
  grains: { label: 'Grains & Cereals', icon: '\u{1F33E}', blurb: 'Maize, rice, sorghum and millet in bulk.' },
  tubers: { label: 'Tubers', icon: '\u{1F954}', blurb: 'Yam, cassava and potato at scale.' },
  legumes: { label: 'Legumes', icon: '\u{1FAD8}', blurb: 'Cowpea, soybean and groundnut lots.' },
  spices: { label: 'Spices & Herbs', icon: '\u{1F336}\u{FE0F}', blurb: 'Pepper, ginger and aromatic crops.' },
}

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_META).map(([value, meta]) => ({
  value,
  label: `${meta.icon} ${meta.label}`,
}))

export const TRADE_UNITS = ['kg', 'bags', 'tons', 'tonnes', 'pieces', 'cartons', 'buckets', 'crates']

export function hubsForState(state) {
  return AGRO_HUBS[state] || []
}
