import type { Trip } from './model'
const key = (id: string) => `world-travel-draft:${id}`
export function storeDraft(trip: Trip) {
  localStorage.setItem(key(trip.id), JSON.stringify(trip))
}
export function clearDraft(id: string) {
  localStorage.removeItem(key(id))
}
export function readDraft(id: string): Trip | null {
  try {
    const raw = localStorage.getItem(key(id))
    if (!raw) return null
    const draft = JSON.parse(raw)
    return draft.id === id &&
      Array.isArray(draft.destinations) &&
      Array.isArray(draft.packing_items)
      ? (draft as Trip)
      : null
  } catch {
    return null
  }
}
export function downloadDraft(trip: Trip) {
  const copy = {
    ...trip,
    destinations: trip.destinations.map((d) => ({
      ...d,
      travel_photos: d.travel_photos.map(({ id, storage_path }) => ({ id, storage_path })),
    })),
  }
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = '세계여행-임시본.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
