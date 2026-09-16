import { Plane, Hotel, MapPinned, ExternalLink } from 'lucide-react'

export function ResearchLinks({ dirty, demo }: { dirty: boolean; demo: boolean }) {
  return (
    <section className="research-tools no-print" aria-label="여행 조사 도구">
      <div>
        <strong>여행 조사 도구</strong>
        <span>직접 찾아보고 내 여행에 기록해요</span>
      </div>
      <div className="research-links">
        {[
          {
            title: '항공권 검색',
            service: '네이버 항공권',
            href: 'https://flight.naver.com/',
            Icon: Plane,
          },
          {
            title: '호텔 검색',
            service: '네이버 호텔',
            href: 'https://hotels.naver.com/',
            Icon: Hotel,
          },
          {
            title: '구글 지도 검색',
            service: 'Google Maps',
            href: 'https://www.google.com/maps/',
            Icon: MapPinned,
          },
        ].map(({ title, service, href, Icon }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${title} · ${service} (새 창)`}
          >
            <Icon size={19} />
            <span>
              {title}
              <small>{service}</small>
            </span>
            <ExternalLink size={14} />
          </a>
        ))}
      </div>
      <p>
        {dirty && !demo
          ? '저장하지 않은 변경 사항이 있어요. 위의 저장 버튼을 누른 뒤 검색해 주세요. '
          : ''}
        새 창에서 열려요. 검색 후 이 탭으로 돌아오거나 앱 전환에서 ‘지구 한 바퀴’를 선택하세요.
        {demo ? ' 체험 기록은 새로고침하면 사라져요.' : ''}
      </p>
    </section>
  )
}
