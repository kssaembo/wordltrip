import { Flag } from './Flag'
import { useState } from 'react'
import { Trash2, ImagePlus, MapPin } from 'lucide-react'
import { costFields, destinationCost, money } from '../lib/model'
import { PackingList } from './PackingList'
import type { Destination, PackingItem } from '../lib/model'
export function DestinationEditor({
  destination: d,
  onChange,
  packingItems,
  onPackingChange,
  onUpload,
  onDeletePhoto,
  disabled,
  busy,
}: {
  destination: Destination
  packingItems: PackingItem[]
  onPackingChange: (items: PackingItem[]) => void
  onChange: (d: Destination) => void
  onUpload: (f: File) => Promise<void>
  onDeletePhoto: (id: string) => void
  disabled: boolean
  busy: boolean
}) {
  const home = d.kind !== 'visit'
  const [tab, setTab] = useState(home ? 'packing' : 'plan')
  const patch = (changes: Partial<Destination>) => onChange({ ...d, ...changes })
  return (
    <section className="editor panel">
      <div className="editor-heading">
        <div className="destination-flag">
          <Flag code={d.country_code} />
        </div>
        <div>
          <p className="eyebrow">DESTINATION {String(d.visit_order + 1).padStart(2, '0')}</p>
          <h2>
            {d.country_name} <span>여행 기록</span>
          </h2>
        </div>
        <span className="tag">
          <MapPin size={14} />{' '}
          {home
            ? d.kind === 'departure'
              ? '대한민국 출발'
              : '대한민국 도착'
            : d.city || '도시를 정해 주세요'}
        </span>
      </div>
      {home && (
        <fieldset className="editor-fields home-time" disabled={disabled || busy}>
          <label>
            {d.kind === 'departure' ? '출발' : '도착'} 날짜와 시간
            <input
              type="datetime-local"
              value={
                d.visit_date && d.visit_time ? d.visit_date + 'T' + d.visit_time.slice(0, 5) : ''
              }
              onChange={(e) => {
                const [date = '', time = ''] = e.target.value.split('T')
                patch({ visit_date: date, visit_time: time })
              }}
              onBlur={(e) => {
                const [date = '', time = ''] = e.currentTarget.value.split('T')
                patch({ visit_date: date, visit_time: time })
              }}
            />
          </label>
        </fieldset>
      )}
      <div className="tabs" role="tablist">
        {(home
          ? [['packing', '준비물']]
          : [
              ['plan', '여행 계획'],
              ['packing', '준비물'],
              ['photos', '사진'],
              ['cost', '여행 비용'],
              ['diary', '여행 일기'],
            ]
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            disabled={id === 'packing' && !home}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={tab === id ? 'active' : ''}
          >
            {label}
            {id === 'photos' && <small>{d.travel_photos.length}/3</small>}
          </button>
        ))}
      </div>
      <fieldset disabled={disabled || busy} className="editor-fields">
        {tab === 'plan' && (
          <>
            <div className="field-row">
              <label>
                도시 또는 관광지
                <input
                  value={d.city}
                  maxLength={150}
                  placeholder="예: 도쿄, 피라미드"
                  onChange={(e) => patch({ city: e.target.value })}
                />
              </label>
              <label>
                여행 예정 날짜
                <input
                  type="date"
                  onBlur={(e) => patch({ visit_date: e.currentTarget.value })}
                  value={d.visit_date || ''}
                  onChange={(e) => patch({ visit_date: e.target.value })}
                />
              </label>
            </div>
            <label>
              이 여행지를 선택한 이유
              <textarea
                value={d.reason}
                maxLength={10000}
                placeholder="어떤 점이 궁금해서 이곳에 가고 싶나요?"
                onChange={(e) => patch({ reason: e.target.value })}
              />
            </label>
            <label>
              나의 여행 일정
              <textarea
                value={d.schedule}
                maxLength={20000}
                placeholder="직접 조사한 내용을 바탕으로 하루를 계획해 보세요."
                onChange={(e) => patch({ schedule: e.target.value })}
              />
            </label>
            <label>
              꼭 해 보고 싶은 활동
              <textarea
                value={d.activities}
                maxLength={10000}
                placeholder="이 여행지에서 무엇을 해 보고 싶나요?"
                onChange={(e) => patch({ activities: e.target.value })}
              />
            </label>
          </>
        )}
        {tab === 'packing' && home && (
          <PackingList items={packingItems} onChange={onPackingChange} />
        )}
        {tab === 'photos' && (
          <>
            <p className="muted">
              직접 만든 여행 사진을 남겨 보세요. 사진은 자동으로 작게 저장해요.
            </p>
            <div className="photo-grid">
              {d.travel_photos.map((p) => (
                <figure key={p.id}>
                  <img src={p.url} alt={`${d.country_name} 여행 사진`} />
                  <button aria-label="사진 삭제" onClick={() => onDeletePhoto(p.id)}>
                    <Trash2 size={16} />
                  </button>
                </figure>
              ))}
              {d.travel_photos.length < 3 && (
                <label className="upload-zone">
                  <ImagePlus size={32} />
                  <strong>{busy ? '사진 처리 중…' : '여행 사진 추가'}</strong>
                  <span>JPG · PNG · WebP / 최대 3장</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="여행 사진 업로드"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void onUpload(f)
                      e.target.value = ''
                    }}
                  />
                </label>
              )}
            </div>
            <p className="fineprint">긴 변 1600px 이하 · 1MB 이하 WebP로 압축하여 저장합니다.</p>
          </>
        )}
        {tab === 'cost' && (
          <>
            <p className="muted">직접 조사한 비용을 원화(원)로 입력해 주세요.</p>
            <div className="cost-fields">
              {costFields.map(([key, label]) => (
                <label key={key}>
                  {label}
                  <div className="currency-input">
                    <input
                      type="number"
                      min="0"
                      max="1000000000"
                      step="1"
                      value={d[key]}
                      onChange={(e) =>
                        patch({
                          [key]: Math.min(
                            1000000000,
                            Math.max(0, Math.floor(Number(e.target.value) || 0)),
                          ),
                        })
                      }
                    />
                    <span>원</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="cost-total">
              <span>이 여행지의 예상 비용</span>
              <strong>{money(destinationCost(d))}</strong>
            </div>
          </>
        )}
        {tab === 'diary' && (
          <>
            <label>
              나의 여행 일기
              <textarea
                className="tall"
                value={d.diary}
                maxLength={30000}
                placeholder="이곳을 여행하는 나를 상상하며, 보고 느낀 것을 기록해 보세요."
                onChange={(e) => patch({ diary: e.target.value })}
              />
            </label>
            <label>
              여행을 통해 알게 된 점
              <textarea
                className="tall"
                value={d.learned}
                maxLength={20000}
                placeholder="조사하며 새롭게 알게 된 점, 더 알아보고 싶은 점을 적어 보세요."
                onChange={(e) => patch({ learned: e.target.value })}
              />
            </label>
          </>
        )}
      </fieldset>
      {!home && (
        <div className="editor-fields">
          <PackingList items={packingItems} readOnly />
        </div>
      )}
    </section>
  )
}
