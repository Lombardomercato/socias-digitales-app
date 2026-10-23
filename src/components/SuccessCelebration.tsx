'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import './success-celebration.css'

export interface SuccessCelebrationInput {
  key: string
  title: string
  message: string
  variant?: 'confetti' | 'gentle'
}
export type SuccessCelebrationEvent = SuccessCelebrationInput & { variant: 'confetti' | 'gentle' }
const DURATION = 3500
const MAX_SEEN = 64
const papers = Array.from({ length: 18 }, (_, i) => ({
  x: `${4 + (i % 9) * 11.5}%`, drift: `${((i * 17) % 61) - 30}px`,
  turn: `${(i * 43) % 180}deg`, fall: `${76 + (i % 5) * 15}px`,
  color: ['#EC9BB6', '#F4CAD8', '#294A38', '#EC9BB6'][i % 4],
  radius: i % 3 === 0 ? '50%' : '1px',
}))

// Call only from the confirmed-success branch of a user action. No storage,
// network, shared state or inference from page data is involved.
export function useSuccessCelebration() {
  const [celebration, setCelebration] = useState<SuccessCelebrationEvent | null>(null)
  const seen = useRef(new Set<string>())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; if (timer.current !== null) clearTimeout(timer.current); timer.current = null }
  }, [])
  const dismiss = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
    if (mounted.current) setCelebration(null)
  }, [])
  const celebrate = useCallback((input: SuccessCelebrationInput): void => {
    if (!mounted.current || !input.key.trim() || !input.title.trim() || !input.message.trim() || seen.current.has(input.key)) return
    seen.current.add(input.key)
    if (seen.current.size > MAX_SEEN) {
      const first = seen.current.values().next().value
      if (first !== undefined) seen.current.delete(first)
    }
    if (timer.current !== null) clearTimeout(timer.current)
    setCelebration({ ...input, variant: input.variant ?? 'confetti' })
    timer.current = setTimeout(() => { timer.current = null; if (mounted.current) setCelebration(null) }, DURATION)
  }, [])
  return { celebration, celebrate, dismiss }
}

export function SuccessCelebration({ celebration, placement = 'floating' }: {
  celebration: SuccessCelebrationEvent | null
  placement?: 'floating' | 'inline'
}) {
  return <>
    <span className="sd-success-live" role="status" aria-live="polite" aria-atomic="true">{celebration ? `${celebration.title} ${celebration.message}` : ''}</span>
    {celebration && <div key={celebration.key} className={`sd-success-celebration sd-success-celebration--${placement}`} aria-hidden="true">
      {celebration.variant === 'confetti' && <span className="sd-success-papers">{papers.map((paper, i) => <span key={i} className="sd-success-paper" style={{ '--sd-paper-x': paper.x, '--sd-paper-drift': paper.drift, '--sd-paper-turn': paper.turn, '--sd-paper-fall': paper.fall, '--sd-paper-color': paper.color, '--sd-paper-radius': paper.radius } as CSSProperties} />)}</span>}
      <div className="sd-success-card"><span className="sd-success-sparkle">✦</span><div className="sd-success-copy"><p className="sd-success-title">{celebration.title}</p><p className="sd-success-message">{celebration.message}</p></div></div>
    </div>}
  </>
}

export default SuccessCelebration
