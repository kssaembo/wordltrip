export type PackingItem = { id: string; text: string; checked: boolean }
export type Photo = { id: string; storage_path: string; url?: string }
export type Destination = {
  id: string
  kind: 'departure' | 'visit' | 'arrival'
  visit_time: string
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
  travel_photos: Photo[]
}
export type Trip = {
  revision?: number
  id: string
  student_id: string
  title: string
  packing_items: PackingItem[]
  submitted: boolean
  destinations: Destination[]
}
export type Student = {
  deleted_at?: string | null
  id: string
  project_id: string
  nickname: string
}
export type Project = { deleted_at?: string | null; id: string; title: string; class_code: string }
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
  kind: 'visit',
  visit_time: '',
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
  travel_photos: [],
})

export const newHome = (kind: 'departure' | 'arrival', order: number): Destination => ({
  ...newDestination('KR', '대한민국', order),
  kind,
})
export const visits = (trip: Trip) => trip.destinations.filter((d) => d.kind === 'visit')
export const stopLabel = (d: Destination) =>
  d.kind === 'departure' ? '출발' : d.kind === 'arrival' ? '도착' : d.city || '도시를 정해 주세요'
export const submissionIssues = (trip: Trip) => {
  const issues: string[] = []
  const first = trip.destinations[0],
    last = trip.destinations.at(-1)
  if (!last || last.kind !== 'arrival' || last.country_code !== 'KR')
    issues.push('마지막 도착지를 대한민국으로 설정해주세요.')
  if (!first || first.kind !== 'departure' || first.country_code !== 'KR')
    issues.push('출발지는 대한민국이어야 합니다.')
  if (!trip.title.trim()) issues.push('여행 제목을 입력해 주세요.')
  if (!visits(trip).length) issues.push('해외 여행지를 하나 이상 추가해 주세요.')
  trip.destinations.forEach((d) => {
    if (d.kind !== 'visit') {
      if (!d.visit_date || !d.visit_time)
        issues.push('대한민국 ' + stopLabel(d) + ' 날짜와 시간을 설정해 주세요.')
    } else if (
      !d.city.trim() ||
      !d.visit_date ||
      !d.reason.trim() ||
      !d.schedule.trim() ||
      !d.activities.trim() ||
      !d.diary.trim() ||
      !d.learned.trim()
    )
      issues.push(
        d.country_name + ': 도시, 날짜, 선택 이유, 일정, 활동, 일기, 알게 된 점을 작성해 주세요.',
      )
  })
  if (
    first?.visit_date &&
    first.visit_time &&
    last?.kind === 'arrival' &&
    last.visit_date &&
    last.visit_time &&
    last.visit_date + 'T' + last.visit_time <= first.visit_date + 'T' + first.visit_time
  )
    issues.push('도착 시간은 출발 시간보다 늦어야 합니다.')
  return issues
}
