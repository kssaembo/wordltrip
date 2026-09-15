import { useState } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import type { PackingItem } from '../lib/model'
export function PackingList({
  items,
  onChange,
  readOnly = false,
}: {
  items: PackingItem[]
  onChange?: (items: PackingItem[]) => void
  readOnly?: boolean
}) {
  const [text, setText] = useState('')
  function add() {
    if (text.trim() && onChange) {
      onChange([...items, { id: crypto.randomUUID(), text: text.trim(), checked: false }])
      setText('')
    }
  }
  return (
    <div className="shared-packing">
      <h3>공통 준비물</h3>
      <p className="muted">
        {readOnly
          ? '대한민국 출발·도착 화면에서 준비물을 설정할 수 있어요.'
          : '여행 전체에서 함께 사용하는 준비물 목록이에요.'}
      </p>
      {!readOnly && (
        <div className="packing-add">
          <input
            aria-label="새 준비물"
            maxLength={100}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            placeholder="예: 여권, 우산, 충전기"
          />
          <button className="primary" disabled={!text.trim()} onClick={add}>
            <Plus size={17} /> 추가
          </button>
        </div>
      )}
      <div className="packing-list">
        {items.map((item) => (
          <div key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={item.checked}
                disabled={readOnly}
                onChange={(e) =>
                  onChange?.(
                    items.map((x) => (x.id === item.id ? { ...x, checked: e.target.checked } : x)),
                  )
                }
              />
              <span className={item.checked ? 'checked' : ''}>{item.text}</span>
            </label>
            {!readOnly && (
              <button
                aria-label={`${item.text} 삭제`}
                onClick={() => onChange?.(items.filter((x) => x.id !== item.id))}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {!items.length && <p className="muted">등록한 준비물이 없어요.</p>}
      <p className="muted">
        <Check size={15} />
        {items.filter((p) => p.checked).length} / {items.length}개 준비 완료
      </p>
    </div>
  )
}
