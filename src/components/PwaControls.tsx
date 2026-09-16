import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface InstallEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
}
export function PwaControls() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null)
  const [help, setHelp] = useState(false)
  const [installed, setInstalled] = useState(
    () =>
      matchMedia('(display-mode: standalone)').matches ||
      !!(navigator as Navigator & { standalone?: boolean }).standalone,
  )
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const offer = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallEvent)
    }
    const done = () => {
      setInstalled(true)
      setPrompt(null)
      setHelp(false)
    }
    const connection = () => setOffline(!navigator.onLine)
    window.addEventListener('beforeinstallprompt', offer)
    window.addEventListener('appinstalled', done)
    window.addEventListener('online', connection)
    window.addEventListener('offline', connection)
    return () => {
      window.removeEventListener('beforeinstallprompt', offer)
      window.removeEventListener('appinstalled', done)
      window.removeEventListener('online', connection)
      window.removeEventListener('offline', connection)
    }
  }, [])
  async function install() {
    if (!prompt) {
      setHelp(true)
      return
    }
    try {
      await prompt.prompt()
    } catch {
      setHelp(true)
    } finally {
      setPrompt(null)
    }
  }
  return (
    <div className="pwa-controls no-print">
      {offline && (
        <p className="connection-banner" role="status">
          인터넷 연결이 끊겼어요. 현재 화면을 닫지 말고, 연결 후 저장해 주세요.
        </p>
      )}
      {!installed && (
        <button className="install-button" onClick={() => void install()}>
          <Download size={16} />
          {prompt ? '앱 설치' : '앱 설치 안내'}
        </button>
      )}
      {help && (
        <div className="install-help" role="region" aria-label="앱 설치 안내">
          <button className="help-close" aria-label="설치 안내 닫기" onClick={() => setHelp(false)}>
            <X size={18} />
          </button>
          <strong>지구 한 바퀴를 앱으로</strong>
          <p>Chrome·Edge: 브라우저 메뉴의 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요.</p>
          <p>iPhone·iPad: Safari에서 열고 공유 → ‘홈 화면에 추가’를 선택하세요.</p>
          <p>
            학교에서 관리하는 기기는 설치가 제한될 수 있어요. 설치하지 않아도 웹에서 사용할 수
            있어요.
          </p>
          <small>기록 저장과 사진 업로드에는 인터넷이 필요해요.</small>
        </div>
      )}
    </div>
  )
}
