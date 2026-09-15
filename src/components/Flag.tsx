export function Flag({ code }: { code: string }) {
  return /^[A-Z]{2}$/.test(code) ? (
    <img className="country-flag" src={`/flags/${code}.svg`} alt={code} width="27" height="18" />
  ) : (
    <span aria-label={code}>🌐</span>
  )
}
