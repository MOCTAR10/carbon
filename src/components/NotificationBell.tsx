'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X, Check, CheckCheck, Award, Shield, CreditCard, FileText, Info, Loader2 } from 'lucide-react'
import Link from 'next/link'

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

const TYPE_ICON: Record<string, React.ReactNode> = {
  cert_request:          <Shield className="w-4 h-4 text-brand-600" />,
  cert_assigned:         <Award className="w-4 h-4 text-blue-500" />,
  cert_validated:        <Award className="w-4 h-4 text-emerald-500" />,
  cert_rejected:         <Award className="w-4 h-4 text-red-500" />,
  cert_comment:          <FileText className="w-4 h-4 text-purple-500" />,
  new_subscription:      <CreditCard className="w-4 h-4 text-emerald-500" />,
  subscription_expiring: <CreditCard className="w-4 h-4 text-amber-500" />,
  assessment_saved:      <FileText className="w-4 h-4 text-brand-500" />,
  system:                <Info className="w-4 h-4 text-gray-400" />,
}

const TYPE_BG: Record<string, string> = {
  cert_request:          'bg-brand-50',
  cert_assigned:         'bg-blue-50',
  cert_validated:        'bg-emerald-50',
  cert_rejected:         'bg-red-50',
  cert_comment:          'bg-purple-50',
  new_subscription:      'bg-emerald-50',
  subscription_expiring: 'bg-amber-50',
  assessment_saved:      'bg-brand-50',
  system:                'bg-gray-50',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "À l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `il y a ${d}j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function NotificationBell({ portal = 'user', theme = 'light' }: Props) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const portalParam = portal !== 'user' ? `?portal=${portal}` : ''

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications${portalParam}`)
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnread(data.unread ?? 0)
    } catch { /* silent */ }
  }, [portalParam])

  // Poll every 30s
  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, 30000)
    return () => clearInterval(id)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const openPanel = async () => {
    setOpen(v => !v)
    if (!open) {
      setLoading(true)
      await fetchNotifications()
      setLoading(false)
    }
  }

  const markOne = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
    await fetch(`/api/notifications/${id}${portalParam}`, { method: 'PATCH' })
  }

  const markAll = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
    await fetch(`/api/notifications/read-all${portalParam}`, { method: 'POST' })
  }

  const isDark = theme === 'dark'

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={openPanel}
        className={`relative p-2 rounded-xl transition-colors ${
          isDark
            ? 'text-gray-400 hover:text-white hover:bg-gray-800'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none animate-pulse">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className={`absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl border z-50 overflow-hidden ${
          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}>

          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <Bell className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Notifications
              </span>
              {unread > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAll}
                  title="Tout marquer comme lu"
                  className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 ${
                    isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[420px]">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell className={`w-8 h-8 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Aucune notification</p>
              </div>
            ) : (
              notifications.map(n => {
                const icon = TYPE_ICON[n.type] ?? TYPE_ICON.system
                const bg = TYPE_BG[n.type] ?? TYPE_BG.system
                const content = (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b last:border-b-0 ${
                      isDark
                        ? `border-gray-800 ${n.read ? 'hover:bg-gray-800/50' : 'bg-gray-800/70 hover:bg-gray-800'}`
                        : `border-gray-50 ${n.read ? 'hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50/60'}`
                    }`}
                    onClick={() => !n.read && markOne(n.id)}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${isDark ? 'bg-gray-700' : bg}`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {n.message}
                      </p>
                      <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.read && (
                      <button
                        onClick={e => { e.stopPropagation(); markOne(n.id) }}
                        className={`flex-shrink-0 p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-500' : 'hover:bg-gray-100 text-gray-400'}`}
                        title="Marquer comme lu"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )

                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => { markOne(n.id); setOpen(false) }}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className={`px-4 py-2.5 border-t ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-100 bg-gray-50'}`}>
              <p className={`text-[11px] text-center ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                {notifications.length} notification{notifications.length > 1 ? 's' : ''} · Les 50 plus récentes
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
