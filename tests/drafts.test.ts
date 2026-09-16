import { it, expect, vi, afterEach } from 'vitest'
import { readDraft, storeDraft, clearDraft } from '../src/lib/drafts'
import { newHome } from '../src/lib/model'
afterEach(() => vi.unstubAllGlobals())
it('임시본은 여행별로 분리되고 서버 저장 성공 후 지울 수 있다', () => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    setItem: (k: string, v: string) => data.set(k, v),
    getItem: (k: string) => data.get(k) ?? null,
    removeItem: (k: string) => data.delete(k),
  })
  const trip = {
    id: 'one',
    student_id: 'student',
    title: '기록',
    revision: 3,
    submitted: false,
    destinations: [newHome('departure', 0)],
    packing_items: [],
  }
  storeDraft(trip)
  expect(readDraft('one')).toEqual(trip)
  expect(readDraft('other')).toBeNull()
  clearDraft('one')
  expect(readDraft('one')).toBeNull()
})
it('손상된 임시본은 서버 기록 로딩을 막지 않고 보관 실패는 호출자에게 전달한다', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => '{bad',
    setItem: () => {
      throw new Error('quota')
    },
  })
  expect(readDraft('one')).toBeNull()
  expect(() =>
    storeDraft({
      id: 'one',
      student_id: 's',
      title: 't',
      submitted: false,
      destinations: [],
      packing_items: [],
    }),
  ).toThrow('quota')
})
