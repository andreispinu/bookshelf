export function translateCategory(
  category: string | null | undefined,
  t: (key: string) => string
): string {
  if (!category) return ''
  try {
    return t(category)
  } catch {
    return category
  }
}
