/**
 * Small inline SVG flags.
 *
 * Regional-indicator emoji (🇮🇳) are not used: Windows ships no colour flag
 * font, so those code points render as bare letters ("IN") on a large share of
 * business desktops. Inline SVG renders identically everywhere.
 *
 * Flags are decorative — the location label always sits beside them — so each
 * one is `aria-hidden`. Unknown country codes render nothing rather than a
 * placeholder.
 */
type CountryFlagProps = {
  countryCode: string | undefined
  className?: string
}

const WIDTH = 20
const HEIGHT = 14

function Frame({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <clipPath id={id}>
          <rect width={WIDTH} height={HEIGHT} rx="2" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>{children}</g>
      <rect
        width={WIDTH}
        height={HEIGHT}
        rx="2"
        fill="none"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="0.7"
      />
    </svg>
  )
}

const FLAGS: Record<string, (id: string) => React.ReactElement> = {
  IN: (id) => (
    <Frame id={id}>
      <rect width={WIDTH} height={4.67} fill="#FF9933" />
      <rect y={4.67} width={WIDTH} height={4.66} fill="#FFFFFF" />
      <rect y={9.33} width={WIDTH} height={4.67} fill="#138808" />
      <circle cx="10" cy="7" r="1.7" fill="none" stroke="#000080" strokeWidth="0.6" />
    </Frame>
  ),
  PK: (id) => (
    <Frame id={id}>
      <rect width={WIDTH} height={HEIGHT} fill="#01411C" />
      <rect width="5" height={HEIGHT} fill="#FFFFFF" />
      <circle cx="13" cy="7" r="3.3" fill="#FFFFFF" />
      <circle cx="14.3" cy="6" r="3.1" fill="#01411C" />
      <path d="m15.6 4.4.5 1.2 1.2.2-.9.9.2 1.2-1-.6-1.1.6.2-1.2-.8-.9 1.2-.2Z" fill="#FFFFFF" />
    </Frame>
  ),
  US: (id) => (
    <Frame id={id}>
      <rect width={WIDTH} height={HEIGHT} fill="#FFFFFF" />
      {[0, 2, 4, 6, 8, 10, 12].map((y) => (
        <rect key={y} y={y} width={WIDTH} height="1" fill="#B22234" />
      ))}
      <rect width="9" height="7.5" fill="#3C3B6E" />
      {[1.2, 3.4, 5.6].map((y) =>
        [1.3, 3.3, 5.3, 7.3].map((x) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="0.45" fill="#FFFFFF" />
        )),
      )}
    </Frame>
  ),
  CO: (id) => (
    <Frame id={id}>
      <rect width={WIDTH} height="7" fill="#FCD116" />
      <rect y="7" width={WIDTH} height="3.5" fill="#003893" />
      <rect y="10.5" width={WIDTH} height="3.5" fill="#CE1126" />
    </Frame>
  ),
  AZ: (id) => (
    <Frame id={id}>
      <rect width={WIDTH} height={4.67} fill="#00B5E2" />
      <rect y={4.67} width={WIDTH} height={4.66} fill="#EF3340" />
      <rect y={9.33} width={WIDTH} height={4.67} fill="#509E2F" />
      <circle cx="9.4" cy="7" r="2.1" fill="#FFFFFF" />
      <circle cx="10.3" cy="7" r="1.75" fill="#EF3340" />
      <path d="m12.7 5.8.35.9.95.05-.72.62.23.93-.81-.5-.82.5.24-.93-.73-.62.96-.05Z" fill="#FFFFFF" />
    </Frame>
  ),
  SA: (id) => (
    <Frame id={id}>
      <rect width={WIDTH} height={HEIGHT} fill="#006C35" />
      <rect x="3" y="6" width="14" height="0.9" fill="#FFFFFF" />
      <rect x="3" y="8.4" width="10" height="0.7" fill="#FFFFFF" />
    </Frame>
  ),
}

export function CountryFlag({ countryCode, className }: CountryFlagProps) {
  if (!countryCode) return null

  const code = countryCode.toUpperCase()
  const render = FLAGS[code]
  if (!render) return null

  return <span className={className}>{render(`flag-${code}`)}</span>
}
