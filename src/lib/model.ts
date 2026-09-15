export type PackingItem = { id: string; text: string; checked: boolean }
export type Photo = { id: string; storage_path: string; url?: string }
export type Destination = {
  id: string
  country_code: string
  country_name: string
  city: string
  visit_order: number
  visit_date: string
  reason: string
  schedule: string
  activities: string
  diary: string
  learned: string
  transport_cost: number
  accommodation_cost: number
  food_cost: number
  activity_cost: number
  etc_cost: number
  packing_items: PackingItem[]
  travel_photos: Photo[]
}
export type Trip = {
  id: string
  student_id: string
  title: string
  submitted: boolean
  destinations: Destination[]
}
export type Student = { id: string; project_id: string; nickname: string }
export type Project = { id: string; title: string; class_code: string }
export const costFields = [
  ['transport_cost', '교통비'],
  ['accommodation_cost', '숙박비'],
  ['food_cost', '식비'],
  ['activity_cost', '체험비'],
  ['etc_cost', '기타 비용'],
] as const
export const destinationCost = (d: Destination) =>
  costFields.reduce((sum, [key]) => sum + (Number(d[key]) || 0), 0)
export const totalCost = (trip: Trip) =>
  trip.destinations.reduce((sum, d) => sum + destinationCost(d), 0)
export const money = (value: number) => new Intl.NumberFormat('ko-KR').format(value) + '원'
export const flag = (code: string) =>
  /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)))
    : '🌐'
export const newDestination = (code: string, name: string, order: number): Destination => ({
  id: crypto.randomUUID(),
  country_code: code,
  country_name: name,
  city: '',
  visit_order: order,
  visit_date: '',
  reason: '',
  schedule: '',
  activities: '',
  diary: '',
  learned: '',
  transport_cost: 0,
  accommodation_cost: 0,
  food_cost: 0,
  activity_cost: 0,
  etc_cost: 0,
  packing_items: [],
  travel_photos: [],
})
export const submissionIssues = (trip: Trip) => {
  const issues: string[] = []
  if (!trip.title.trim()) issues.push('여행 제목을 입력해 주세요.')
  if (!trip.destinations.length) issues.push('여행지를 하나 이상 추가해 주세요.')
  trip.destinations.forEach((d) => {
    if (
      !d.city.trim() ||
      !d.visit_date ||
      !d.reason.trim() ||
      !d.schedule.trim() ||
      !d.activities.trim() ||
      !d.diary.trim() ||
      !d.learned.trim()
    )
      issues.push(
        `${d.country_name}: 도시, 날짜, 선택 이유, 일정, 활동, 일기, 알게 된 점을 작성해 주세요.`,
      )
  })
  return issues
}
