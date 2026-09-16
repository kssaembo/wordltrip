import { it, expect, vi } from 'vitest'
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { runInNewContext } from 'node:vm'

it('설치 manifest 아이콘은 선언한 크기의 실제 PNG이고 시작 화면이 존재한다', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'))
  expect(manifest.display).toBe('standalone')
  for (const icon of manifest.icons) {
    const png = readFileSync(`public${icon.src}`)
    expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes)
  }
  const html = readFileSync('index.html', 'utf8')
  const startups = [...html.matchAll(/href="(\/pwa\/splash-[^"]+)"/g)]
  expect(startups.length).toBe(8)
  for (const entry of startups)
    expect(readFileSync(`public${entry[1]}`).length).toBeGreaterThan(100)
})

it('서비스 워커는 Supabase·사진·저장 요청을 가로채지 않고 연결 실패 때만 공개 오프라인 화면을 반환한다', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'world-travel-sw-test-'))
  mkdirSync(join(directory, 'dist/pwa'), { recursive: true })
  for (const file of ['offline.html', 'pwa/icon-192.png'])
    copyFileSync(`public/${file}`, join(directory, 'dist', file))
  execFileSync(process.execPath, [resolve('scripts/build-sw.mjs')], { cwd: directory })
  const handlers: Record<string, (event: unknown) => void> = {}
  const fallback = new Response('offline')
  const match = vi.fn(async () => fallback)
  const fetcher = vi.fn(async () => new Response('online'))
  runInNewContext(readFileSync(join(directory, 'dist/sw.js'), 'utf8'), {
    URL,
    fetch: fetcher,
    caches: { open: async () => ({ match }) },
    self: {
      location: { origin: 'https://class.example' },
      addEventListener: (type: string, handler: (typeof handlers)[string]) => {
        handlers[type] = handler
      },
    },
  })
  const respondWith = vi.fn()
  for (const request of [
    { method: 'GET', url: 'https://project.supabase.co/rest/v1/trips', mode: 'cors' },
    {
      method: 'GET',
      url: 'https://project.supabase.co/storage/v1/object/sign/photo',
      mode: 'cors',
    },
    { method: 'POST', url: 'https://class.example/save', mode: 'cors' },
  ])
    handlers.fetch({ request, respondWith })
  expect(respondWith).not.toHaveBeenCalled()
  let response: Promise<Response> | undefined
  const navigate = () =>
    handlers.fetch({
      request: { method: 'GET', url: 'https://class.example/', mode: 'navigate' },
      respondWith: (value: Promise<Response>) => {
        response = value
      },
    })
  navigate()
  expect(await (await response!).text()).toBe('online')
  expect(match).not.toHaveBeenCalled()
  fetcher.mockRejectedValueOnce(new Error('offline'))
  navigate()
  expect(await response).toBe(fallback)
  expect(match).toHaveBeenCalledWith('/offline.html')
})
