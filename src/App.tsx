import { teacherIdentity } from './lib/teacherAuth'
import { readDraft, storeDraft, clearDraft, downloadDraft } from './lib/drafts'
import { ResearchLinks } from './components/ResearchLinks'
import { Flag } from './components/Flag'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Globe2,
  Plane,
  Map,
  BookOpen,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Save,
  Send,
  LogOut,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { WorldMap } from './components/WorldMap'
import type { Country } from './lib/countries'
import { DestinationEditor } from './components/DestinationEditor'
import { Passport, Portfolio } from './components/Portfolio'
import { db } from './lib/supabase'
import * as api from './lib/api'
import {
  newDestination,
  newHome,
  visits,
  stopLabel,
  totalCost,
  money,
  submissionIssues,
} from './lib/model'
import type { Trip, Student, Project, Destination } from './lib/model'
import { compressImage } from './lib/images'
import './App.css'
const demoStudent: Student = { id: 'demo', project_id: 'demo', nickname: '여행자01' }
function demoTrip(): Trip {
  return {
    id: 'demo',
    student_id: 'demo',
    title: '세상을 만나는 나의 첫 여행',
    submitted: false,
    destinations: [newHome('departure', 0)],
    packing_items: [],
  }
}
function Brand() {
  return (
    <div className="brand">
      <span>
        <img src="/pwa/icon-192.png" alt="" width="42" height="42" />
      </span>
      <div>
        지구 한 바퀴<small>MY WORLD JOURNAL</small>
      </div>
    </div>
  )
}
export default function App() {
  const [student, setStudent] = useState<Student | null>(null)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [demo, setDemo] = useState(false)
  const [teacher, setTeacher] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [view, setView] = useState('map')
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dirty, setDirty] = useState(false)
  const [recovery, setRecovery] = useState<Trip | null>(null)
  const [confirm, setConfirm] = useState<'submit' | 'exit' | null>(null)
  const [portfolio, setPortfolio] = useState<{ trip: Trip; student: Student } | null>(null)
  const actionLock = useRef(false)
  const changeVersion = useRef(0)
  const uploadUrls = useRef<string[]>([])
  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const {
          data: { session },
        } = await db().auth.getSession()
        if (!session) return
        if (!session.user.is_anonymous) {
          if (live) setTeacher(true)
          return
        }
        const s = await api.myStudent()
        if (s) {
          const t = await api.loadTrip(s.id)
          if (live) {
            setStudent(s)
            setTrip(t)
            setRecovery(readDraft(t.id))
            setSelected(t.destinations[0]?.id || '')
          }
        }
      } catch (e) {
        if (live) setError(api.explainError(e))
      } finally {
        if (live) setInitializing(false)
      }
    })()
    return () => {
      live = false
    }
  }, [])
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const run = useCallback(async (action: () => Promise<void>) => {
    if (actionLock.current) return
    actionLock.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
    } catch (e) {
      setError(api.explainError(e))
    } finally {
      actionLock.current = false
      setBusy(false)
    }
  }, [])
  const change = (next: Trip) => {
    changeVersion.current += 1
    if (!demo) {
      try {
        storeDraft(next)
      } catch {
        setError('기기 임시 보관 공간이 부족합니다. 저장 버튼을 눌러 서버에 저장해 주세요.')
      }
    }
    setTrip(next)
    setDirty(true)
    setNotice('')
  }
  const persist = useCallback(
    async (t = trip) => {
      if (!t) return
      const changeAtStart = changeVersion.current
      const revision = demo ? t.revision : await api.saveTrip(t)
      setTrip((current) => (current?.id === t.id ? { ...current, revision } : current))
      if (changeVersion.current !== changeAtStart) {
        if (!demo) {
          try {
            const latest = readDraft(t.id)
            if (latest) storeDraft({ ...latest, revision })
          } catch {
            setError('추가 변경의 임시 보관에 실패했습니다. 저장 버튼을 눌러 주세요.')
          }
        }
        setDirty(true)
        return
      }
      if (!demo) {
        try {
          clearDraft(t.id)
        } catch {
          /* Keep the server save successful even if local storage is unavailable. */
        }
      }
      setRecovery(null)
      setDirty(false)
      setNotice(
        demo ? '체험 내용입니다. 이 화면을 나가면 사라집니다.' : '모든 변경 사항을 저장했어요.',
      )
    },
    [trip, demo],
  )
  useEffect(() => {
    if (!dirty || demo || !trip || trip.submitted) return
    const timer = setTimeout(() => {
      if (!actionLock.current) void run(() => persist())
    }, 2500)
    return () => clearTimeout(timer)
  }, [trip, dirty, demo, run, persist])
  function selectCountry(c: Country) {
    if (!trip) return
    if (trip.submitted || busy) return
    if (c.code === 'KR') {
      addArrival()
      return
    }
    const existing = trip.destinations.find((d) => d.country_code === c.code)
    if (existing) {
      setSelected(existing.id)
      return
    }
    if (visits(trip).length >= 48) {
      setError('해외 여행지는 최대 48개입니다.')
      return
    }
    const d = newDestination(c.code, c.name, trip.destinations.length)
    const arrival = trip.destinations.find((x) => x.kind === 'arrival')
    const list = [
      ...trip.destinations.filter((x) => x.kind !== 'arrival'),
      d,
      ...(arrival ? [arrival] : []),
    ]
    change({ ...trip, destinations: list.map((x, i) => ({ ...x, visit_order: i })) })
    setSelected(d.id)
  }
  function addArrival() {
    if (!trip || trip.submitted || busy) return
    const existing = trip.destinations.find((d) => d.kind === 'arrival')
    if (existing) {
      setSelected(existing.id)
      return
    }
    const d = newHome('arrival', trip.destinations.length)
    change({ ...trip, destinations: [...trip.destinations, d] })
    setSelected(d.id)
  }
  const current = trip?.destinations.find((d) => d.id === selected) ?? trip?.destinations[0]
  async function upload(file: File) {
    await run(async () => {
      if (!trip || !student || !current) return
      if (current.travel_photos.length >= 3) throw new Error('사진은 최대 3장입니다.')
      const blob = await compressImage(file)
      await persist()
      let photo
      if (demo) {
        const url = URL.createObjectURL(blob)
        uploadUrls.current.push(url)
        photo = { id: crypto.randomUUID(), storage_path: 'demo', url }
      } else photo = await api.uploadPhoto(student.project_id, student.id, current, blob)
      setTrip((latest) =>
        latest
          ? {
              ...latest,
              destinations: latest.destinations.map((d) =>
                d.id === current.id ? { ...d, travel_photos: [...d.travel_photos, photo] } : d,
              ),
            }
          : latest,
      )
      setNotice(`사진을 압축해 저장했어요. (${Math.round(blob.size / 1024)}KB · WebP)`)
    })
  }
  async function removePhoto(id: string) {
    await run(async () => {
      if (!trip || !current) return
      const p = current.travel_photos.find((p) => p.id === id)
      if (!p) return
      if (!demo) await api.deletePhoto(p.id, p.storage_path)
      setTrip({
        ...trip,
        destinations: trip.destinations.map((d) =>
          d.id === current.id
            ? { ...d, travel_photos: d.travel_photos.filter((p) => p.id !== id) }
            : d,
        ),
      })
      setNotice('사진을 삭제했어요.')
    })
  }
  async function removeDestination(d: Destination) {
    if (d.kind === 'departure') return
    if (!window.confirm(`${d.country_name}의 기록과 사진을 삭제할까요?`)) return
    await run(async () => {
      if (!trip) return
      if (!demo) {
        for (const p of d.travel_photos) await api.deletePhoto(p.id, p.storage_path)
      }
      const next = {
        ...trip,
        destinations: trip.destinations
          .filter((x) => x.id !== d.id)
          .map((x, i) => ({ ...x, visit_order: i })),
      }
      if (!demo) {
        next.revision = await api.saveTrip(next)
        clearDraft(next.id)
      }
      setTrip(next)
      setDirty(false)
      setSelected(next.destinations[0]?.id || '')
    })
  }
  function move(index: number, delta: number) {
    if (!trip) return
    if (
      trip.destinations[index]?.kind !== 'visit' ||
      trip.destinations[index + delta]?.kind !== 'visit'
    )
      return
    const list = [...trip.destinations]
    ;[list[index], list[index + delta]] = [list[index + delta], list[index]]
    change({ ...trip, destinations: list.map((d, i) => ({ ...d, visit_order: i })) })
  }
  async function leave() {
    await run(async () => {
      if (!demo) {
        if (dirty) await persist()
        const { error } = await db().auth.signOut()
        if (error) throw error
      }
      uploadUrls.current.forEach(URL.revokeObjectURL)
      uploadUrls.current = []
      setTrip(null)
      setRecovery(null)
      setStudent(null)
      setTeacher(false)
      setDemo(false)
      setDirty(false)
      setConfirm(null)
      setNotice('')
    })
  }
  if (portfolio) return <Portfolio {...portfolio} onClose={() => setPortfolio(null)} />
  if (initializing)
    return (
      <div className="loading app-splash" role="status">
        <img src="/pwa/icon-512.png" alt="" width="180" height="180" />
        <Brand />
        <p>여행 기록을 불러오는 중…</p>
      </div>
    )
  if (teacher)
    return (
      <TeacherDashboard
        error={error}
        busy={busy}
        run={run}
        onExit={() => setConfirm('exit')}
        onView={(t, s) => setPortfolio({ trip: t, student: s })}
        exitDialog={
          confirm === 'exit' ? (
            <Confirm
              title="로그아웃할까요?"
              text="다음에 교사 계정으로 다시 로그인할 수 있어요."
              onCancel={() => setConfirm(null)}
              onConfirm={() => void leave()}
              busy={busy}
            />
          ) : null
        }
      />
    )
  if (!trip || !student)
    return (
      <Entry
        busy={busy}
        error={error}
        run={run}
        onTeacher={() => setTeacher(true)}
        onJoin={async (code, name, pin) => {
          const s = await api.joinClass(code, name, pin)
          const t = await api.loadTrip(s.id)
          setStudent(s)
          setTrip(t)
          setRecovery(readDraft(t.id))
          setSelected(t.destinations[0]?.id || '')
        }}
        onDemo={() => {
          setDemo(true)
          setStudent(demoStudent)
          setTrip(demoTrip())
          setSelected('')
          setError('')
        }}
      />
    )
  return (
    <div className="app-shell">
      <header className="app-header">
        <Brand />
        <div className="header-center">
          <span className="live-dot" />
          {demo ? '체험 학급' : '우리 반 세계여행 프로젝트'}
        </div>
        <div className="header-user">
          <span className="avatar">{student.nickname.slice(0, 1)}</span>
          <strong>{student.nickname}</strong>
          <button aria-label="나가기" onClick={() => setConfirm('exit')}>
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <p className="eyebrow">MY ADVENTURE</p>
          <nav>
            {[
              ['map', '여행 만들기', Map],
              ['passport', '디지털 여권', BookOpen],
            ].map(([id, label, Icon]) => {
              const I = Icon as typeof Map
              return (
                <button
                  key={String(id)}
                  className={view === id ? 'active' : ''}
                  onClick={() => setView(String(id))}
                >
                  <I size={19} />
                  {String(label)}
                </button>
              )
            })}
            <button onClick={() => setPortfolio({ trip, student })}>
              <LayoutGrid size={19} />
              포트폴리오
            </button>
          </nav>
          <div className="sidebar-note">
            <Plane size={25} />
            <strong>
              세상은 넓고,
              <br />
              궁금한 건 많으니까.
            </strong>
            <p>
              직접 찾아보고 기록하는
              <br />
              우리들의 세계여행
            </p>
          </div>
          <div className="sidebar-footer">
            <span>나의 여행 스탬프</span>
            <strong>
              {String(visits(trip).length).padStart(2, '0')} <small>개국</small>
            </strong>
            <div className="mini-stamps">
              {visits(trip)
                .slice(0, 5)
                .map((d) => (
                  <span key={d.id}>
                    <Flag code={d.country_code} />
                  </span>
                ))}
            </div>
          </div>
        </aside>
        <main className="workspace">
          <details className="privacy-note">
            <summary>내 기록을 안전하게 지키는 약속</summary>
            <p>
              실명·연락처·주소는 적지 마세요. 학급 코드와 PIN은 친구에게 알려주지 마세요. 다른
              사람의 사진은 허락 없이 올리지 마세요.
            </p>
            <p>
              제출한 기록과 사진은 담당 선생님이 볼 수 있어요. 보관 기간은 선생님께 확인하고, 삭제를
              원하면 선생님께 요청하세요. 공용 기기에서는 저장을 마친 뒤 꼭 로그아웃하세요.
            </p>
          </details>
          {demo && (
            <div className="demo-banner">
              체험 모드 · 내용은 이 화면에서만 유지됩니다. 실제 저장·제출은 학급 코드로 참가해
              주세요.
            </div>
          )}
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">YOUR NEXT CHAPTER</p>
              <h1>
                {view === 'passport' ? '나만의 디지털 여권' : `${student.nickname}의 세계여행`}
              </h1>
              <p className="muted">지도 위에 목적지를 더하고, 나만의 이야기를 채워 보세요.</p>
            </div>
            <div className="workspace-actions">
              <span className="save-status">
                {trip.submitted ? '✓ 제출 완료' : dirty ? '● 저장할 변경 사항 있음' : '✓ 저장됨'}
              </span>
              {!trip.submitted && (
                <button
                  className="outline"
                  disabled={busy}
                  onClick={() => void run(() => persist())}
                >
                  <Save size={17} /> 저장
                </button>
              )}
              <button
                className="primary"
                disabled={busy || trip.submitted}
                onClick={() => {
                  const issues = submissionIssues(trip)
                  if (issues.length) {
                    setError(issues.join('\n'))
                    return
                  }
                  setConfirm('submit')
                }}
              >
                <Send size={17} />
                {trip.submitted ? '제출 완료' : '최종 제출'}
              </button>
            </div>
          </div>
          {recovery && (
            <div className="notice no-print">
              <strong>이 기기에 저장되지 않은 임시본이 있어요.</strong>
              <p>
                서버 기록을 확인한 뒤 복원하세요. 다른 기기에서 바뀐 기록은 자동으로 덮어쓰지
                않습니다.
              </p>
              <button onClick={() => downloadDraft(recovery)}>임시본 다운로드</button>
              <button
                disabled={trip.submitted || (recovery.revision ?? 0) !== (trip.revision ?? 0)}
                onClick={() => {
                  change({
                    ...recovery,
                    destinations: recovery.destinations.map((d) => ({
                      ...d,
                      travel_photos:
                        trip.destinations.find((x) => x.id === d.id)?.travel_photos ?? [],
                    })),
                  })
                  setRecovery(null)
                }}
              >
                임시본 복원
              </button>
              <button
                onClick={() => {
                  clearDraft(trip.id)
                  setRecovery(null)
                }}
              >
                서버 기록 사용
              </button>
            </div>
          )}
          {dirty && !demo && (
            <button className="no-print" onClick={() => downloadDraft(trip)}>
              임시본 다운로드
            </button>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
          {trip.submitted && (
            <div className="notice">
              {demo ? '체험 제출한 여행입니다.' : '선생님께 제출한 여행입니다.'} 포트폴리오에서 전체
              기록과 PDF를 확인할 수 있어요.
            </div>
          )}
          <ResearchLinks dirty={dirty} demo={demo} />
          {view === 'passport' ? (
            <Passport trip={trip} student={student} />
          ) : (
            <>
              <div className="trip-title-row">
                <Plane size={20} />
                <input
                  aria-label="여행 제목"
                  maxLength={100}
                  value={trip.title}
                  disabled={busy || trip.submitted}
                  onChange={(e) => change({ ...trip, title: e.target.value })}
                />
                <span>MY TRAVEL PLAN</span>
              </div>
              <div className="travel-grid">
                <section className="map-panel panel">
                  <div className="panel-title">
                    <h2>
                      <Globe2 size={19} /> 나의 여행 지도
                    </h2>
                    <span>{visits(trip).length}개국의 새로운 발견</span>
                  </div>
                  <WorldMap
                    destinations={trip.destinations}
                    selected={current?.country_code}
                    onSelect={trip.submitted ? undefined : selectCountry}
                  />
                </section>
                <section className="route-panel panel">
                  <div className="panel-title">
                    <h2>여행 경로</h2>
                    <span className="count">{trip.destinations.length}</span>
                  </div>
                  <div className="route-list">
                    {trip.destinations.length === 0 ? (
                      <div className="empty-route">
                        <Map size={34} />
                        <strong>첫 목적지는 어디인가요?</strong>
                        <p>
                          지도에서 국가를 누르거나
                          <br />
                          국가 이름을 검색해 보세요.
                        </p>
                      </div>
                    ) : (
                      trip.destinations.map((d, i) => (
                        <div
                          className={`route-item ${current?.id === d.id ? 'active' : ''}`}
                          key={d.id}
                        >
                          <button className="route-select" onClick={() => setSelected(d.id)}>
                            <span className="route-number">{i + 1}</span>
                            <span className="route-flag">
                              <Flag code={d.country_code} />
                            </span>
                            <span>
                              <strong>{d.country_name}</strong>
                              <small>{stopLabel(d)}</small>
                            </span>
                          </button>
                          {!trip.submitted && (
                            <div className="route-buttons">
                              <button
                                disabled={
                                  busy ||
                                  d.kind !== 'visit' ||
                                  trip.destinations[i - 1]?.kind !== 'visit'
                                }
                                aria-label={`${d.country_name} 순서 앞으로`}
                                onClick={() => move(i, -1)}
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                disabled={
                                  busy ||
                                  d.kind !== 'visit' ||
                                  trip.destinations[i + 1]?.kind !== 'visit'
                                }
                                aria-label={`${d.country_name} 순서 뒤로`}
                                onClick={() => move(i, 1)}
                              >
                                <ArrowDown size={14} />
                              </button>
                              <button
                                disabled={busy || d.kind === 'departure'}
                                aria-label={`${d.country_name} ${stopLabel(d)} 여행지 삭제`}
                                onClick={() => void removeDestination(d)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  {!trip.submitted && !trip.destinations.some((d) => d.kind === 'arrival') && (
                    <button className="outline return-home" disabled={busy} onClick={addArrival}>
                      <Plane size={16} /> 대한민국 도착 추가
                    </button>
                  )}
                  <div className="route-summary">
                    <span>전체 예상 여행 비용</span>
                    <strong>{money(totalCost(trip))}</strong>
                    <small>직접 조사한 비용의 합계예요</small>
                  </div>
                </section>
              </div>
              {current ? (
                <DestinationEditor
                  key={current.id}
                  destination={current}
                  packingItems={trip.packing_items}
                  onPackingChange={(items) => change({ ...trip, packing_items: items })}
                  disabled={trip.submitted}
                  busy={busy}
                  onChange={(d) =>
                    change({
                      ...trip,
                      destinations: trip.destinations.map((x) => (x.id === d.id ? d : x)),
                    })
                  }
                  onUpload={upload}
                  onDeletePhoto={(id) => void removePhoto(id)}
                />
              ) : (
                <section className="start-card">
                  <span>01</span>
                  <div>
                    <h2>여행할 국가를 골라 주세요</h2>
                    <p>선택한 나라의 여행 계획, 사진, 비용, 일기를 여기에 기록해요.</p>
                  </div>
                  <ArrowRight size={24} />
                </section>
              )}
              <footer className="workspace-footer">
                <span>작은 호기심이 큰 여행의 시작이 됩니다.</span>
                <span>지구 한 바퀴 · WORLD JOURNAL</span>
              </footer>
            </>
          )}
        </main>
      </div>
      {confirm === 'submit' && (
        <Confirm
          title="여행 기록을 최종 제출할까요?"
          text={
            demo
              ? '체험 제출입니다. 실제 선생님에게 전달되지 않습니다. 제출 후 이 체험 기록은 수정할 수 없어요.'
              : '제출 후에는 기록과 사진을 수정할 수 없어요. 선생님이 포트폴리오를 열람할 수 있습니다.'
          }
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            void run(async () => {
              await persist()
              if (!demo) await api.submitTrip(trip.id)
              setTrip({ ...trip, submitted: true })
              setConfirm(null)
              setNotice(demo ? '체험 제출이 완료됐어요.' : '선생님께 제출했어요!')
            })
          }
          busy={busy}
        />
      )}{' '}
      {confirm === 'exit' && (
        <Confirm
          title={demo ? '체험을 마칠까요?' : '로그아웃할까요?'}
          text={
            demo
              ? '작성한 체험 내용이 사라집니다.'
              : `${dirty ? '변경 사항을 서버에 저장한 뒤 로그아웃합니다. 저장에 실패하면 이 화면을 유지합니다. ' : ''}같은 학급 코드와 닉네임을 입력하면 다른 기기에서도 다시 접속할 수 있어요.`
          }
          onCancel={() => setConfirm(null)}
          onConfirm={() => void leave()}
          busy={busy}
        />
      )}
    </div>
  )
}
function Confirm({
  title,
  text,
  onCancel,
  onConfirm,
  busy,
}: {
  title: string
  text: string
  onCancel: () => void
  onConfirm: () => void
  busy: boolean
}) {
  return (
    <div className="modal-backdrop">
      <section
        className="modal panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onCancel()
          if (event.key !== 'Tab') return
          const buttons =
            event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
          const first = buttons[0]
          const last = buttons[buttons.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          }
          if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
      >
        <h2>{title}</h2>
        <p>{text}</p>
        <div>
          <button className="outline" autoFocus onClick={onCancel} disabled={busy}>
            취소
          </button>
          <button className="primary" onClick={onConfirm} disabled={busy}>
            {busy ? '처리 중…' : '확인'}
          </button>
        </div>
      </section>
    </div>
  )
}
function Entry({
  busy,
  error,
  run,
  onTeacher,
  onJoin,
  onDemo,
}: {
  busy: boolean
  error: string
  run: (fn: () => Promise<void>) => Promise<void>
  onTeacher: () => void
  onJoin: (c: string, n: string, pin: string) => Promise<void>
  onDemo: () => void
}) {
  const [role, setRole] = useState('student')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [signup, setSignup] = useState(false)
  const [message, setMessage] = useState('')
  return (
    <div className="entry">
      <header>
        <Brand />
        <button className="outline" onClick={onDemo}>
          체험해 보기 <ArrowRight size={16} />
        </button>
      </header>
      <main className="entry-content">
        <section className="entry-story">
          <p className="eyebrow">YOUR WORLD. YOUR STORY.</p>
          <h1>
            지도 위의 호기심,
            <br />
            <em>나만의 세계여행.</em>
          </h1>
          <p>
            가고 싶은 나라를 고르고, 직접 찾아보고,
            <br />
            우리만의 여행 기록책을 완성해요.
          </p>
          <WorldMap destinations={[]} />
          <div className="entry-caption">
            <span>01 나라 고르기</span>
            <span>02 여행 기록하기</span>
            <span>03 기록책 완성하기</span>
          </div>
        </section>
        <section className="entry-form panel">
          <div className="boarding-label">
            <Plane size={22} />
            <span>
              BOARDING PASS
              <br />
              <b>나의 여행이 시작되는 곳</b>
            </span>
          </div>
          <div className="tabs">
            <button
              className={role === 'student' ? 'active' : ''}
              onClick={() => setRole('student')}
            >
              학생 참가
            </button>
            <button
              className={role === 'teacher' ? 'active' : ''}
              onClick={() => setRole('teacher')}
            >
              교사 로그인
            </button>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {message && <div className="notice">{message}</div>}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void run(async () => {
                setMessage('')
                if (role === 'student') await onJoin(code, name, pin)
                else if (signup) {
                  const { data, error } = await db().auth.signUp({
                    email: teacherIdentity(loginId, true),
                    password,
                  })
                  if (error) throw error
                  if (data.session) onTeacher()
                  else
                    setMessage(
                      '즉시 가입 설정이 아직 적용되지 않았습니다. 관리자에게 Supabase의 Confirm Email 해제를 요청해 주세요. 이 아이디가 이미 생성되었다면 관리자가 해당 계정의 확인 상태도 처리해야 합니다.',
                    )
                } else {
                  const { error } = await db().auth.signInWithPassword({
                    email: teacherIdentity(loginId),
                    password,
                  })
                  if (error) throw error
                  onTeacher()
                }
              })
            }}
          >
            {role === 'student' ? (
              <>
                <label>
                  학급 코드
                  <input
                    required
                    value={code}
                    maxLength={8}
                    minLength={4}
                    pattern="(?:[0-9]{4}|[A-Za-z0-9]{8})"
                    placeholder="4자리 숫자 코드 (기존 8자리도 가능)"
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                </label>
                <label>
                  나의 닉네임
                  <input
                    required
                    value={name}
                    maxLength={24}
                    placeholder="실명 대신 나만의 여행자 이름"
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  나의 PIN (숫자 4자리)
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    pattern="[0-9]{4}"
                    minLength={4}
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="처음에는 설정할 PIN, 다음에는 같은 PIN"
                  />
                </label>
                <p className="fineprint">
                  처음 참가하면 입력한 PIN으로 설정돼요. 다음에는 같은 학급 코드·닉네임·PIN으로
                  접속하세요. 기존 학생의 첫 PIN이나 분실한 PIN은 선생님께 요청하세요. 5회 틀리면
                  5분 후 자동 해제돼요.
                </p>
                <p className="fineprint">
                  실명·연락처·주소 입력과 타인 사진 무단 업로드는 하지 마세요. PIN은 공유하지 말고,
                  공용 기기에서는 저장 후 로그아웃하세요.
                </p>
              </>
            ) : (
              <>
                <label>
                  {signup ? '아이디' : '아이디 또는 기존 이메일'}
                  <input
                    type="text"
                    autoComplete="username"
                    required
                    placeholder={signup ? '영문·숫자·밑줄 3~24자' : '아이디 또는 기존 이메일'}
                    maxLength={signup ? 24 : 254}
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                  />
                </label>
                <label>
                  비밀번호
                  <input
                    type="password"
                    autoComplete={signup ? 'new-password' : 'current-password'}
                    minLength={signup ? 8 : undefined}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                {signup && (
                  <p className="fineprint">
                    이메일 없이 가입합니다. 비밀번호는 8자 이상으로 입력하세요. 비밀번호를 잊으면
                    관리자에게 문의해야 합니다.
                  </p>
                )}
              </>
            )}
            <button className="primary entry-submit" disabled={busy}>
              {busy
                ? '연결 중…'
                : role === 'student'
                  ? '나의 여행 시작하기'
                  : signup
                    ? '교사 계정 만들기'
                    : '교사 로그인'}
              <ArrowRight size={18} />
            </button>
          </form>
          {role === 'teacher' && (
            <button
              className="text-button"
              onClick={() => {
                setSignup(!signup)
                setMessage('')
              }}
            >
              {signup ? '이미 계정이 있어요 · 로그인' : '처음이신가요? 교사 계정 만들기'}
            </button>
          )}
          <div className="ticket-bottom">
            <span>
              DEPARTURE
              <br />
              <b>우리 교실</b>
            </span>
            <Plane size={20} />
            <span>
              ARRIVAL
              <br />
              <b>넓은 세상</b>
            </span>
          </div>
        </section>
      </main>
    </div>
  )
}
function TeacherDashboard({
  error,
  busy,
  run,
  onExit,
  onView,
  exitDialog,
}: {
  error: string
  busy: boolean
  run: (fn: () => Promise<void>) => Promise<void>
  onExit: () => void
  onView: (t: Trip, s: Student) => void
  exitDialog: React.ReactNode
}) {
  const [projects, setProjects] = useState<Project[]>([])
  const [project, setProject] = useState('')
  const [title, setTitle] = useState('')
  const [reopen, setReopen] = useState<{ id: string; nickname: string } | null>(null)
  const [reopenNotice, setReopenNotice] = useState('')
  const [pinStudent, setPinStudent] = useState<Student | null>(null)
  const [newPin, setNewPin] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [archive, setArchive] = useState<{
    kind: 'project' | 'student'
    id: string
    name: string
    restore: boolean
  } | null>(null)
  const [students, setStudents] = useState<Awaited<ReturnType<typeof api.roster>>>([])
  useEffect(() => {
    void run(async () => {
      const list = await api.getProjects()
      setProjects(list)
      const first = list.find((p) => !p.deleted_at)
      setProject(first?.id || '')
      if (first) setStudents(await api.roster(first.id))
    })
  }, [run])
  async function choose(id: string) {
    await run(async () => {
      const next = await api.roster(id)
      setProject(id)
      setStudents(next)
    })
  }
  return (
    <div className="teacher-page">
      <header className="app-header">
        <Brand />
        <span className="tag">교사 공간</span>
        <button onClick={onExit}>
          <LogOut size={18} /> 로그아웃
        </button>
      </header>
      <main className="teacher-content">
        <p className="eyebrow">CLASSROOM JOURNEYS</p>
        <h1>우리 반의 세계여행</h1>
        <p className="muted">학생들의 여행이 한 권의 기록책으로 완성되는 곳.</p>
        <div className="privacy-note">
          <strong>프로젝트 종료 후 자료 정리</strong>
          <p>
            개인정보 보호를 위해 완료된 포트폴리오를 PDF로 다운로드하여 안전한 곳에 보관하고
            프로젝트를 삭제해 주세요. 학생에게 열람 범위와 보관·삭제 시점을 안내해 주세요.
          </p>
          <p>
            현재 삭제는 접근을 차단하는 복구 가능한 보관 처리입니다. DB 기록·사진은 남으므로 보관
            기간이 끝나면 운영자가 Supabase의 DB와 Storage에서 함께 영구 삭제해야 합니다. 내려받은
            PDF도 보관 기간 후 삭제해 주세요.
          </p>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <section className="panel project-create">
          <h2>새 여행 프로젝트</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void run(async () => {
                const p = await api.createProject(title)
                setProjects([p, ...projects])
                setProject(p.id)
                setStudents([])
                setTitle('')
              })
            }}
          >
            <input
              required
              maxLength={100}
              aria-label="프로젝트 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 6학년 2반 세계여행"
            />
            <button className="primary" disabled={busy || !title.trim()}>
              <Plus size={17} /> 프로젝트 만들기
            </button>
          </form>
        </section>
        <button onClick={() => setShowDeleted(!showDeleted)}>
          {showDeleted ? '삭제 항목 숨기기' : '삭제 항목 보기·복구'}
        </button>
        <div className="project-tabs">
          {projects
            .filter((p) => showDeleted || !p.deleted_at)
            .map((p) => (
              <div key={p.id}>
                <button
                  disabled={busy}
                  className={p.id === project ? 'active' : ''}
                  onClick={() => void choose(p.id)}
                >
                  {p.title}
                  {p.deleted_at ? ' (삭제됨)' : ''}
                </button>
                <button
                  disabled={busy}
                  aria-label={p.title + (p.deleted_at ? ' 프로젝트 복구' : ' 프로젝트 삭제')}
                  onClick={() =>
                    setArchive({
                      kind: 'project',
                      id: p.id,
                      name: p.title,
                      restore: !!p.deleted_at,
                    })
                  }
                >
                  {p.deleted_at ? '복구' : '×'}
                </button>
              </div>
            ))}
        </div>
        {project && (
          <section className="panel roster">
            <div className="roster-heading">
              <div>
                <h2>{projects.find((p) => p.id === project)?.title}</h2>
                <p>
                  학급 코드{' '}
                  <strong className="class-code">
                    {projects.find((p) => p.id === project)?.class_code}
                  </strong>
                </p>
              </div>
              <div>
                <span>
                  {students.filter((s) => !s.deleted_at && s.trips[0]?.submitted).length} /{' '}
                  {students.filter((s) => !s.deleted_at).length}명 제출
                </span>
                <button
                  disabled={busy}
                  aria-label="제출 현황 새로고침"
                  onClick={() => void choose(project)}
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>학생 닉네임</th>
                  <th>제출 상태</th>
                  <th>포트폴리오</th>
                  <th>제출 관리</th>
                  <th>PIN 관리</th>
                  <th>학생 삭제</th>
                </tr>
              </thead>
              <tbody>
                {students
                  .filter((s) => showDeleted || !s.deleted_at)
                  .map((s) => (
                    <tr key={s.id}>
                      <td>
                        {s.nickname}
                        {s.deleted_at ? ' (삭제됨)' : ''}
                      </td>
                      <td>
                        <span className={`status-pill ${s.trips[0]?.submitted ? 'done' : ''}`}>
                          {s.trips[0]?.submitted ? (
                            <>
                              <CheckCircle2 size={14} /> 제출 완료
                            </>
                          ) : (
                            '작성 중'
                          )}
                        </span>
                      </td>
                      <td>
                        <button
                          disabled={
                            busy ||
                            !!s.deleted_at ||
                            !!projects.find((p) => p.id === project)?.deleted_at ||
                            !s.trips[0]?.submitted
                          }
                          onClick={() =>
                            void run(async () => {
                              onView(await api.loadTrip(s.id), s)
                            })
                          }
                        >
                          전체화면 열람 <ArrowRight size={15} />
                        </button>
                      </td>
                      <td>
                        <button
                          disabled={busy || !s.trips[0]?.submitted}
                          onClick={() => setReopen({ id: s.trips[0].id, nickname: s.nickname })}
                        >
                          제출 취소
                        </button>
                      </td>
                      <td>
                        <button
                          disabled={
                            busy ||
                            !!s.deleted_at ||
                            !!projects.find((p) => p.id === project)?.deleted_at
                          }
                          onClick={() => {
                            setNewPin('')
                            setPinStudent(s)
                          }}
                        >
                          PIN 설정·초기화
                        </button>
                      </td>
                      <td>
                        <button
                          disabled={busy}
                          aria-label={s.nickname + (s.deleted_at ? ' 학생 복구' : ' 학생 삭제')}
                          onClick={() =>
                            setArchive({
                              kind: 'student',
                              id: s.id,
                              name: s.nickname,
                              restore: !!s.deleted_at,
                            })
                          }
                        >
                          {s.deleted_at ? '복구' : '×'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!students.length && (
              <p className="roster-empty">
                학급 코드를 학생들에게 알려 주세요. 참가한 학생이 여기에 표시됩니다.
              </p>
            )}
          </section>
        )}
      </main>
      {pinStudent && (
        <div className="modal-backdrop">
          <section
            className="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pin-title"
            style={{ padding: 24, maxWidth: 460 }}
          >
            <h2 id="pin-title">{pinStudent.nickname}의 PIN 설정·초기화</h2>
            <p>
              학생 본인을 확인한 뒤 새 PIN을 알려 주세요. PIN 오류 제한을 해제하고 기존 기기의
              접근을 종료합니다. 저장된 기록은 유지됩니다.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void run(async () => {
                  await api.resetStudentPin(pinStudent.id, newPin)
                  setPinStudent(null)
                  setNewPin('')
                  setReopenNotice('PIN을 설정했습니다. 학생은 새 PIN으로 다시 접속해 주세요.')
                })
              }}
            >
              <label>
                새 PIN (숫자 4자리)
                <input
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                />
              </label>
              <p className="fineprint">
                기기 자체의 과도한 접속 제한은 최대 5분 뒤 자동 해제됩니다.
              </p>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPinStudent(null)
                  setNewPin('')
                }}
              >
                취소
              </button>
              <button className="primary" disabled={busy || newPin.length !== 4}>
                PIN 저장·제한 해제
              </button>
            </form>
          </section>
        </div>
      )}
      {reopenNotice && (
        <p className="notice" role="status">
          {reopenNotice}
        </p>
      )}
      {reopen && (
        <Confirm
          title={reopen.nickname + '의 제출을 취소할까요?'}
          text="기록은 유지되며 학생이 다시 수정하고 제출할 수 있습니다. 학생은 화면을 새로고침해 주세요."
          busy={busy}
          onCancel={() => setReopen(null)}
          onConfirm={() =>
            void run(async () => {
              await api.reopenTrip(reopen.id)
              setReopen(null)
              setReopenNotice('제출을 취소했습니다. 학생이 새로고침하면 다시 작성할 수 있어요.')
              setStudents(await api.roster(project))
            })
          }
        />
      )}
      {archive && (
        <Confirm
          title={archive.name + (archive.restore ? '을(를) 복구할까요?' : '을(를) 삭제할까요?')}
          text={
            archive.restore
              ? '보관된 기록을 다시 사용할 수 있습니다.'
              : '목록에서 숨기고 학생 접근을 차단합니다. 기록·사진은 보관되며 삭제 항목 보기에서 복구할 수 있습니다.'
          }
          busy={busy}
          onCancel={() => setArchive(null)}
          onConfirm={() =>
            void run(async () => {
              await api.archiveRecord(archive.kind, archive.id, archive.restore)
              const list = await api.getProjects()
              setProjects(list)
              let selectedProject = project
              if (archive.kind === 'project' && !archive.restore && archive.id === project)
                selectedProject = list.find((p) => !p.deleted_at)?.id ?? ''
              setProject(selectedProject)
              setStudents(selectedProject ? await api.roster(selectedProject) : [])
              setReopenNotice(
                archive.restore
                  ? '복구했습니다.'
                  : '삭제했습니다. 삭제 항목 보기에서 복구할 수 있습니다.',
              )
              setArchive(null)
            })
          }
        />
      )}
      {exitDialog}
    </div>
  )
}
