import { Flag } from './Flag'
import { useState } from 'react'
import { ArrowLeft, Download, Expand, BookOpen } from 'lucide-react'
import { WorldMap } from './WorldMap'
import { loadCountries } from '../lib/countries'
import { costFields, destinationCost, totalCost, money } from '../lib/model'
import type { Trip, Student } from '../lib/model'
export function Passport({ trip, student }: { trip: Trip; student: Student }) {
  return (
    <section className="passport">
      <div className="passport-title">
        <BookOpen size={30} />
        <div>
          <p className="eyebrow">MY DIGITAL PASSPORT</p>
          <h2>{student.nickname}의 디지털 여권</h2>
        </div>
      </div>
      <p className="muted">세계 곳곳에 남긴 나의 발자국 · {trip.destinations.length}개국</p>
      <div className="stamps">
        {trip.destinations.map((d, i) => (
          <div className={`stamp stamp-${i % 3}`} key={d.id}>
            <span className="stamp-top">WORLD EXPLORER · {String(i + 1).padStart(2, '0')}</span>
            <b>
              <Flag code={d.country_code} /> {d.country_name}
            </b>
            <span>{d.city || '도시 미정'}</span>
            <strong>{d.visit_date?.replaceAll('-', '.') || '날짜 미정'}</strong>
            <span className="stamp-bottom">지구 한 바퀴 • TRAVEL JOURNAL</span>
          </div>
        ))}
      </div>
      {!trip.destinations.length && <p>여행지를 추가하면 나만의 스탬프가 생겨요.</p>}
    </section>
  )
}
export function Portfolio({
  trip,
  student,
  onClose,
}: {
  trip: Trip
  student: Student
  onClose: () => void
}) {
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState('')
  async function print() {
    setPrinting(true)
    setError('')
    try {
      await loadCountries()
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      )
      await document.fonts.ready
      await Promise.all(
        Array.from(document.querySelectorAll<HTMLImageElement>('.portfolio img')).map((img) =>
          img.decode(),
        ),
      )
      window.print()
    } catch {
      setError('지도 또는 사진을 불러오지 못했습니다. 화면을 다시 열고 시도해 주세요.')
    } finally {
      setPrinting(false)
    }
  }
  return (
    <div className="portfolio-shell">
      <div className="portfolio-toolbar no-print">
        <button onClick={onClose}>
          <ArrowLeft size={17} /> 돌아가기
        </button>
        <span>나의 세계여행 포트폴리오</span>
        <div>
          <button
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen()
              else
                void document.documentElement
                  .requestFullscreen()
                  .catch(() => setError('브라우저에서 전체화면을 허용해 주세요.'))
            }}
          >
            <Expand size={17} /> 전체화면
          </button>
          <button className="primary" onClick={print} disabled={printing}>
            <Download size={17} /> {printing ? '사진 준비 중…' : 'PDF 다운로드'}
          </button>
        </div>
      </div>
      <p className="print-tip no-print">
        인쇄 창에서 대상을 ‘PDF로 저장’, 용지를 A4로 선택해 주세요.
      </p>
      {error && (
        <p role="alert" className="error no-print">
          {error}
        </p>
      )}
      <article className="portfolio">
        <section className="portfolio-cover print-page">
          <div className="cover-meta">
            <span>지구 한 바퀴 / TRAVEL JOURNAL</span>
            <span>{trip.submitted ? 'FINAL EDITION' : 'DRAFT EDITION'}</span>
          </div>
          <p className="eyebrow">A JOURNEY BY {student.nickname}</p>
          <h1>{trip.title}</h1>
          <p className="cover-subtitle">지도 위에서 시작해, 나만의 이야기로.</p>
          <WorldMap destinations={trip.destinations} large />
          <div className="cover-route">
            {trip.destinations.map((d, i) => (
              <span key={d.id}>
                {i > 0 && <b>→</b>} <Flag code={d.country_code} /> {d.country_name}
              </span>
            ))}
          </div>
          <div className="cover-stats">
            <div>
              <span>여행자</span>
              <strong>{student.nickname}</strong>
            </div>
            <div>
              <span>방문 국가</span>
              <strong>{trip.destinations.length}개국</strong>
            </div>
            <div>
              <span>총 여행 비용</span>
              <strong>{money(totalCost(trip))}</strong>
            </div>
          </div>
        </section>
        {trip.destinations.map((d, i) => (
          <section className="portfolio-destination print-page" key={d.id}>
            <div className="chapter">
              <span>CHAPTER {String(i + 1).padStart(2, '0')}</span>
              <span>{d.visit_date || '날짜 미정'}</span>
            </div>
            <h2>
              <Flag code={d.country_code} /> {d.country_name}
              <small>{d.city}</small>
            </h2>
            {d.travel_photos.length > 0 && (
              <div className="portfolio-photos">
                {d.travel_photos.map((p) => (
                  <img src={p.url} key={p.id} alt={`${d.country_name} 여행 사진`} />
                ))}
              </div>
            )}
            <div className="story-block">
              <h3>이곳으로 떠나는 이유</h3>
              <p>{d.reason || '아직 작성하지 않았어요.'}</p>
            </div>
            <div className="portfolio-columns">
              <div>
                <div className="story-block">
                  <h3>나의 여행 일정</h3>
                  <p>{d.schedule || '아직 작성하지 않았어요.'}</p>
                </div>
                <div className="story-block">
                  <h3>해 보고 싶은 활동</h3>
                  <p>{d.activities || '아직 작성하지 않았어요.'}</p>
                </div>
                <div className="story-block">
                  <h3>가방 속 준비물</h3>
                  <p>
                    {d.packing_items.map((p) => (p.checked ? '☑ ' : '☐ ') + p.text).join(' · ') ||
                      '등록한 준비물이 없어요.'}
                  </p>
                </div>
              </div>
              <div className="budget-box">
                <h3>여행 비용</h3>
                {costFields.map(([key, label]) => (
                  <div key={key}>
                    <span>{label}</span>
                    <span>{money(d[key])}</span>
                  </div>
                ))}
                <div className="budget-total">
                  <b>합계</b>
                  <b>{money(destinationCost(d))}</b>
                </div>
              </div>
            </div>
            <div className="story-block diary-block">
              <h3>나의 여행 일기</h3>
              <p>{d.diary || '아직 작성하지 않았어요.'}</p>
            </div>
            <div className="story-block">
              <h3>여행을 통해 알게 된 점</h3>
              <p>{d.learned || '아직 작성하지 않았어요.'}</p>
            </div>
            <footer>지구 한 바퀴 — {student.nickname}의 여행 기록</footer>
          </section>
        ))}
        <section className="print-page passport-page">
          <Passport trip={trip} student={student} />
          <p className="ending">여행은 끝나도, 호기심은 계속됩니다.</p>
        </section>
      </article>
    </div>
  )
}
