import { useState } from 'react'
import { Plus, X } from 'lucide-react'
export function PlacesInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [text, setText] = useState('')
  const items = value.split('\n').filter(Boolean)
  const next = [...items, text.trim()].join('\n')
  const add = () => {
    if (text.trim() && !items.includes(text.trim()) && next.length <= 150) {
      onChange(next)
      setText('')
    }
  }
  return (
    <div className="places-input">
      <span>도시 또는 관광지</span>
      <div className="packing-add">
        <input
          aria-label="추가할 도시 또는 관광지"
          value={text}
          maxLength={150}
          placeholder="예: 도쿄, 후지산"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button
          type="button"
          className="primary"
          onClick={add}
          disabled={!text.trim() || items.includes(text.trim()) || next.length > 150}
        >
          <Plus size={16} />
          추가
        </button>
      </div>
      <div className="place-chips">
        {items.map((item, i) => (
          <span key={i}>
            {item}
            <button
              type="button"
              aria-label={`${item} 삭제`}
              onClick={() => onChange(items.filter((_, j) => j !== i).join('\n'))}
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      {next.length > 150 && text && (
        <small role="status">도시·관광지는 모두 합쳐 150자까지 입력할 수 있어요.</small>
      )}
    </div>
  )
}
