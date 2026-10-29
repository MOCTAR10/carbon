'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Award, ShieldCheck, CreditCard, FileText, Info, Loader2, XCircle, MessageSquare } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface Notification {
  id: number
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
}

interface Props {
  portal?: 'user' | 'admin' | 'expert'
  theme?: 'light' | 'dark'
}

const TYPE_ICON: Record<string, React.ElementType> = {
  cert_request:          ShieldCheck,
  cert_assigned:         Award,
  cert_validated:        Award,
  cert_rejected:         XCircle,
  cert_comment:          MessageSquare,
  new_subscription:      CreditCard,
  subscription_expiring: CreditCard,
  assessment_saved:      FileText,
  system:                Info,
}

// Light (company) palette — Forest & Ivory; dark keeps the admin/expert shells' grey look
const TYPE_TONE_LIGHT: Record<string, string> = {
  cert_validated: 'bg-gold-50 text-gold-600',
  cert_rejected:  'bg-red-50 text-red-600',
  cert_assigned:  'bg-forest-50 text-forest-700',
  cert_request:   'bg-forest-50 text-forest-700',
}

const stripEmoji = (s: string) => s.replace(/^(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[☀-➿️\s])+/, '')

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'À l’instant'
  if (m < 60) return `Il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `Il y a ${d} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function NotificationBell({ portal = 'user', theme = 'light' }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const portalParam = portal !== 'user' ? `?portal=${portal}` : ''
  const isDark = theme === 'dark'

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications${portalParam}`)
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnread(data.unread ?? 0)
    } catch { /* silent */ }
  }, [portalParam])

  // Poll every 30 s while the tab is visible; refresh as soon as it becomes visible again
  useEffect(() => {
    fetchNotifications()
    const id = setInterval(() => { if (!document.hidden) fetchNotifications() }, 30000)
    const onVisible = () => { if (!document.hidden) fetchNotifications() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [fetchNotifications])

  const onOpenChange = async (next: boolean) => {
    setOpen(next)
    if (next) {
      setLoading(notifications.length === 0)
      await fetchNotifications()
      setLoading(false)
    }
  }

  const markOne = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
    await fetch(`/api/notifications/${id}${portalParam}`, { method: 'PATCH' }).catch(() => {})
  }

  const markAll = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
    await fetch(`/api/notifications/read-all${portalParam}`, { method: 'POST' }).catch(() => {})
  }

  const activate = (n: Notification) => {
    if (!n.read) markOne(n.id)
    if (n.link) { setOpen(false); router.push(n.link) }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'relative flex size-10 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400',
            isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-ink-500 hover:bg-white hover:text-forest-900 data-[state=open]:bg-white data-[state=open]:text-forest-900',
          )}
          aria-label={unread > 0 ? `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}` : 'Notifications'}
        >
          <Bell className="size-5" strokeWidth={1.8} />
          {unread > 0 && (
            <span className={cn(
              'absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none',
              isDark ? 'bg-red-500 text-white' : 'bg-gold-500 text-forest-950 ring-2 ring-ivory-100',
            )}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className={cn(isDark && 'border-gray-700 bg-gray-900')}>
        <div className={cn('flex items-center justify-between border-b px-4 py-3', isDark ? 'border-gray-700' : 'border-ivory-200')}>
          <div className="flex items-baseline gap-2">
            <span className={cn(isDark ? 'text-sm font-semibold text-white' : 'font-display text-lg text-forest-900')}>Notifications</span>
            {unread > 0 && <span className={cn('text-xs', isDark ? 'text-gray-400' : 'text-ink-400')}>{unread} non lue{unread > 1 ? 's' : ''}</span>}
          </div>
          {unread > 0 && (
            <button
              onClick={markAll}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400',
                isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-forest-700 hover:bg-ivory-100',
              )}
            >
              <CheckCheck className="size-3.5" /> Tout marquer lu
            </button>
          )}
        </div>

        <div className="max-h-[min(440px,70vh)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className={cn('size-5 animate-spin', isDark ? 'text-gray-500' : 'text-ink-400')} />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <span className={cn('flex size-11 items-center justify-center rounded-full', isDark ? 'bg-gray-800' : 'border border-ivory-300 bg-ivory-50')}>
                <Bell className={cn('size-5', isDark ? 'text-gray-600' : 'text-forest-400')} strokeWidth={1.6} />
              </span>
              <p className={cn('text-sm font-semibold', isDark ? 'text-gray-400' : 'text-ink-700')}>Vous êtes à jour</p>
              <p className={cn('text-xs', isDark ? 'text-gray-500' : 'text-ink-400')}>Les étapes de vos certifications apparaîtront ici.</p>
            </div>
          ) : (
            <ul>
              {notifications.map(n => {
                const Icon = TYPE_ICON[n.type] ?? TYPE_ICON.system
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => activate(n)}
                      className={cn(
                        'flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-400',
                        isDark
                          ? cn('border-gray-800', n.read ? 'hover:bg-gray-800/50' : 'bg-gray-800/70 hover:bg-gray-800')
                          : cn('border-ivory-200', n.read ? 'hover:bg-ivory-50' : 'bg-gold-50/40 hover:bg-gold-50/70'),
                      )}
                    >
                      <span className={cn(
                        'mt-0.5 flex size-8 flex-shrink-0 items-center justify-center rounded-lg',
                        isDark ? 'bg-gray-700 text-gray-300' : (TYPE_TONE_LIGHT[n.type] ?? 'bg-ivory-200 text-ink-500'),
                      )}>
                        <Icon className="size-4" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className={cn('text-[13px] font-semibold leading-snug', isDark ? 'text-white' : 'text-ink-800')}>{stripEmoji(n.title)}</span>
                          {!n.read && <span className={cn('mt-1.5 size-2 flex-shrink-0 rounded-full', isDark ? 'bg-blue-500' : 'bg-gold-500')} aria-label="Non lue" />}
                        </span>
                        <span className={cn('mt-0.5 block text-xs leading-relaxed', isDark ? 'text-gray-400' : 'text-ink-500')}>{n.message}</span>
                        <span className={cn('mt-1 block text-[11px]', isDark ? 'text-gray-500' : 'text-ink-400')}>{timeAgo(n.created_at)}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
