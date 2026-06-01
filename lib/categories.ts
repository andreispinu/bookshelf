export const CATEGORIES = [
  'Fiction',
  'Non-Fiction',
  'Science Fiction',
  'Fantasy',
  'Mystery & Thriller',
  'Biography & Memoir',
  'History',
  'Science & Technology',
  'Self-Help & Personal Development',
  'Business & Economics',
  'Philosophy',
  'Psychology',
  'Romance',
  'Children & Young Adult',
  'Travel',
  'Art & Design',
  'Poetry',
  'Religion & Spirituality',
  'Health & Wellness',
  'Cooking',
] as const

export type Category = typeof CATEGORIES[number]
