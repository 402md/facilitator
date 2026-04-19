// Small reusable dashboard components. Kept in one file to avoid over-fragmentation;
// split out later if any grows.

interface StatCardProps {
  label: string
  value: string | number
  valueId?: string
  sub?: string | false | null
}

export const StatCard = ({ label, value, valueId, sub }: StatCardProps) => (
  <div class="stat">
    <div class="label">{label}</div>
    <div class="value" id={valueId}>
      {String(value)}
    </div>
    {sub && <div class="sub">{sub}</div>}
  </div>
)

interface SectionProps {
  title: string
  toolbar?: string | false | null
  children?: string | string[]
}

export const Section = ({ title, toolbar, children }: SectionProps) => (
  <section>
    {toolbar ? (
      <div class="section-head">
        <h2>{title}</h2>
        {toolbar}
      </div>
    ) : (
      <h2>{title}</h2>
    )}
    {children}
  </section>
)

interface WindowToggleProps {
  id?: string
  windows?: Array<{ value: '1d' | '7d' | '30d'; label: string }>
  defaultValue?: '1d' | '7d' | '30d'
}

const DEFAULT_WINDOWS = [
  { value: '1d' as const, label: '1d' },
  { value: '7d' as const, label: '7d' },
  { value: '30d' as const, label: '30d' },
]

export const WindowToggle = ({
  id = 'window-toggle',
  windows = DEFAULT_WINDOWS,
  defaultValue = '7d',
}: WindowToggleProps) => (
  <div class="window-toggle" id={id}>
    {windows.map((w) => (
      <button data-window={w.value} class={w.value === defaultValue ? 'active' : undefined}>
        {w.label}
      </button>
    ))}
  </div>
)

interface RankToggleProps {
  id: string
  options: Array<{ value: string; label: string }>
  defaultValue: string
}

export const RankToggle = ({ id, options, defaultValue }: RankToggleProps) => (
  <div class="rank-toggle" id={id}>
    {options.map((o) => (
      <button data-rank={o.value} class={o.value === defaultValue ? 'active' : undefined}>
        {o.label}
      </button>
    ))}
  </div>
)

interface LoadingSlotProps {
  id: string
  message?: string
}

// Reserved container that the client script hydrates on first poll.
export const LoadingSlot = ({ id, message = 'Loading…' }: LoadingSlotProps) => (
  <div id={id} class="slot">
    <p class="loading">{message}</p>
  </div>
)
