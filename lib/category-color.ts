// Maps a book category to a "spine" colour, used as the background for book
// cards that have no cover image. Keys match the canonical values in
// lib/categories.ts (categories are always stored in English). Falls back to
// ink for unmapped categories or no category.
const CATEGORY_COLORS: Record<string, string> = {
  'Fiction': '#8b4513',
  'History': '#4a6741',
  'Science & Technology': '#2c4a6e',
  'Biography & Memoir': '#7a3b3b',
  'Philosophy': '#5a3a6e',
  'Poetry': '#6e3a5a',
  'Romance': '#8b3a4a',
  'Children & Young Adult': '#c4852a',
  'Self-Help & Personal Development': '#3a6e5a',
  'Business & Economics': '#2c4a5a',
  'Science Fiction': '#1e3452',
  'Fantasy': '#4a3a6e',
  'Mystery & Thriller': '#3a2c1a',
  'Governance & Politics': '#3a4a2c',
  'School Books': '#5a4a2c',
}

export function getCategoryColor(category?: string | null): string {
  if (!category) return '#2c1a0e' // ink
  return CATEGORY_COLORS[category] ?? '#2c1a0e'
}
