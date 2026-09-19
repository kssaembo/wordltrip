import { db } from './supabase'
import type { Trip, Student, Project, Destination } from './model'
export async function joinClass(code: string, nickname: string, pin: string) {
  const client = db()
  const {
    data: { session },
  } = await client.auth.getSession()
  if (!session) {
    const { error } = await client.auth.signInAnonymously()
    if (error) throw error
  }
  const { data, error } = await client.rpc('join_class', {
    p_code: code.trim().toUpperCase(),
    p_nickname: nickname.trim(),
    p_pin: pin,
  })
  if (error) throw error
  if (data.error) {
    const wait = data.retry_after ? ` (${Math.ceil(data.retry_after / 60)}분 이내)` : ''
    throw new Error(data.error + wait)
  }
  return data.student as Student
}
export async function resetStudentPin(studentId: string, pin: string) {
  const { error } = await db().rpc('reset_student_pin', { p_student: studentId, p_pin: pin })
  if (error) throw error
}
export async function myStudent() {
  const { data: session, error: sessionError } = await db()
    .from('student_sessions')
    .select('student_id')
    .eq('user_id', (await db().auth.getUser()).data.user?.id ?? '')
    .maybeSingle()
  if (sessionError) throw sessionError
  if (!session) return null
  const { data, error } = await db()
    .from('students')
    .select('id,project_id,nickname')
    .eq('id', session.student_id)
    .maybeSingle()
  if (error) throw error
  return data as Student | null
}
export async function reopenTrip(id: string) {
  const { error } = await db().rpc('reopen_trip', { p_trip: id })
  if (error) throw error
}
export async function loadTrip(studentId: string): Promise<Trip> {
  const { data, error } = await db()
    .from('trips')
    .select('*, packing_items(*), destinations(*, travel_photos(*))')
    .eq('student_id', studentId)
    .single()
  if (error) throw error
  const trip = data as Trip
  trip.destinations.sort((a, b) => a.visit_order - b.visit_order)
  await Promise.all(
    trip.destinations.flatMap((d) =>
      d.travel_photos.map(async (p) => {
        const { data, error } = await db()
          .storage.from('travel-photos')
          .createSignedUrl(p.storage_path, 3600)
        if (error) throw error
        p.url = data.signedUrl
      }),
    ),
  )
  return trip
}
export async function saveTrip(trip: Trip) {
  const { data, error } = await db().rpc('save_trip', {
    p_trip: trip.id,
    p_revision: trip.revision ?? 0,
    p_title: trip.title,
    p_packing: trip.packing_items,
    p_destinations: trip.destinations.map(({ travel_photos: _photos, ...d }) => d),
  })
  if (error) throw error
  return data as number
}
export async function submitTrip(id: string) {
  const { error } = await db().rpc('submit_trip', { p_trip: id })
  if (error) throw error
}
export async function getProjects() {
  const { data, error } = await db()
    .from('projects')
    .select('*')
    .eq('teacher_id', (await db().auth.getUser()).data.user?.id ?? '')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Project[]
}
export async function createProject(title: string) {
  const { data, error } = await db().rpc('create_project', { p_title: title })
  if (error) throw error
  return (Array.isArray(data) ? data[0] : data) as Project
}
export async function roster(projectId: string) {
  const { data, error } = await db()
    .from('students')
    .select('id, project_id, nickname, deleted_at, trips(id, submitted)')
    .eq('project_id', projectId)
    .order('created_at')
  if (error) throw error
  return data.map((row) => ({
    ...row,
    trips: Array.isArray(row.trips) ? row.trips : row.trips ? [row.trips] : [],
  })) as unknown as (Student & { trips: { id: string; submitted: boolean }[] })[]
}
export async function deletePhoto(id: string, path: string) {
  const { error: storageError } = await db().storage.from('travel-photos').remove([path])
  if (storageError) throw storageError
  const { error } = await db().from('travel_photos').delete().eq('id', id)
  if (error) throw error
}
export async function uploadPhoto(
  projectId: string,
  studentId: string,
  d: Destination,
  blob: Blob,
) {
  const id = crypto.randomUUID()
  const path = `${projectId}/${studentId}/${d.id}/${id}.webp`
  const { error } = await db()
    .storage.from('travel-photos')
    .upload(path, blob, { contentType: 'image/webp', upsert: false })
  if (error) throw error
  const { error: rowError } = await db()
    .from('travel_photos')
    .insert({ id, destination_id: d.id, storage_path: path })
  if (rowError) {
    await db().storage.from('travel-photos').remove([path])
    throw rowError
  }
  const { data, error: urlError } = await db()
    .storage.from('travel-photos')
    .createSignedUrl(path, 3600)
  if (urlError) throw urlError
  return { id, storage_path: path, url: data.signedUrl }
}
export function explainError(e: unknown) {
  const message =
    e instanceof Error
      ? e.message
      : typeof e === 'object' && e && 'message' in e
        ? String(e.message)
        : '요청을 처리하지 못했습니다.'
  if (/invalid login credentials/i.test(message)) return '아이디 또는 비밀번호를 확인해 주세요.'
  if (/user already registered/i.test(message))
    return '이미 사용 중인 아이디입니다. 로그인하거나 다른 아이디를 입력해 주세요.'
  if (/email not confirmed/i.test(message))
    return '계정의 확인 상태를 관리자가 확인해야 합니다. 관리자에게 문의해 주세요.'
  if (/anonymous.*disabled/i.test(message))
    return '학생 참가를 위해 Supabase의 익명 로그인을 켜야 합니다. 선생님에게 알려주세요.'
  if (/schema cache|does not exist/i.test(message))
    return '데이터베이스 초기 설정이 필요합니다. README의 SQL 마이그레이션을 적용해 주세요.'
  return message
}

export async function archiveRecord(kind: 'project' | 'student', id: string, restore = false) {
  const { error } = await db().rpc('archive_record', { p_kind: kind, p_id: id, p_restore: restore })
  if (error) throw error
}
