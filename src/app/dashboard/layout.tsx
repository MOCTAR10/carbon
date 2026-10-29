'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Leaf, LayoutDashboard, Building2, ClipboardList, BarChart3,
  LogOut, PanelLeftClose, PanelLeftOpen, Award, Bot, ChevronsUpDown, ShieldCheck,
} from 'lucide-react'
import LoadingScreen from '@/components/LoadingScreen'
import NotificationBell from '@/components/NotificationBell'
import { FEATURES } from '@/lib/features'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

interface UserData {
  id: number
  email: string
  firstName: string
  lastName: string
  phone: string
  company: { id: number; name: string; logoUrl: string | null }
  role: string
}

const NAV_ITEMS = [
  { href: '/dashboard',                label: 'Tableau de bord',       icon: LayoutDashboard },
  { href: '/dashboard/sites',          label: 'Sites & Entités',       icon: Building2 },
  { href: '/dashboard/assessments',    label: 'Bilans Carbone',        icon: ClipboardList },
  { href: '/dashboard/reports',        label: 'Rapports & Graphiques', icon: BarChart3 },
  { href: '/dashboard/certifications', label: 'Certifications',        icon: Award },
  ...(FEATURES.aiAssistant ? [{ href: '/dashboard/assistant', label: 'Assistant IA', icon: Bot }] : []),
]

function initials(u: UserData) {
  return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || u.email[0].toUpperCase()
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserData | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (window.innerWidth < 1024) setExpanded(false)
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated')
        return res.json()
      })
      .then(data => {
        // Admins should never be on the company dashboard — redirect them
        if (data.role === 'admin') {
          router.push('/admin')
          return
        }
        setUser(data)
        setLoading(false)
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) return <LoadingScreen theme="light" label="Chargement du tableau de bord" />

  const current = NAV_ITEMS.find(i => pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href)))

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-ivory-100 font-sans text-ink-800">

        {/* ── Sidebar ── */}
        <aside
          className={cn(
            'relative z-20 flex h-screen flex-shrink-0 flex-col overflow-hidden bg-forest-900 bg-forest-grain text-ivory-100 transition-[width] duration-300 ease-out',
            expanded ? 'w-[264px]' : 'w-[76px]',
          )}
        >
          {/* Brand */}
          <div className={cn('flex h-[72px] flex-shrink-0 items-center gap-3 px-5', !expanded && 'justify-center px-0')}>
            <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-gold-500/15 ring-1 ring-gold-400/40">
                <Leaf className="size-[18px] text-gold-300" strokeWidth={1.8} />
              </div>
              {expanded && (
                <div className="min-w-0 leading-tight">
                  <p className="font-display text-[19px] font-medium tracking-tight text-ivory-50">CarbonTrack</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-300/80">Espace entreprise</p>
                </div>
              )}
            </Link>
          </div>

          {/* Company */}
          {expanded && user?.company && (
            <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
              <div className="flex size-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ivory-50">
                {user.company.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={user.company.logoUrl} alt={user.company.name} className="h-full w-full object-contain p-1" />
                  : <Building2 className="size-4 text-forest-700" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-ivory-50">{user.company.name}</p>
                <p className="text-[11px] text-forest-200/70">Organisation</p>
              </div>
            </div>
          )}

          {/* Nav */}
          <nav className={cn('flex flex-1 flex-col gap-1 overflow-y-auto', expanded ? 'px-3' : 'items-center px-2')}>
            {expanded && (
              <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-forest-200/50">Navigation</p>
            )}
            {NAV_ITEMS.map(item => {
              const isActive = current?.href === item.href
              return (
                <Tooltip key={item.href} content={item.label} disabled={expanded}>
                  <Link
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-colors',
                      expanded ? 'px-3 py-2.5' : 'size-11 justify-center',
                      isActive
                        ? 'bg-white/[0.08] text-ivory-50'
                        : 'text-forest-100/70 hover:bg-white/[0.05] hover:text-ivory-50',
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gold-400" />
                    )}
                    <item.icon
                      className={cn('size-[18px] flex-shrink-0', isActive ? 'text-gold-300' : 'text-forest-200/70 group-hover:text-ivory-100')}
                      strokeWidth={1.8}
                    />
                    {expanded && <span className="truncate">{item.label}</span>}
                  </Link>
                </Tooltip>
              )
            })}
          </nav>

          {/* Trust mark */}
          {expanded && (
            <div className="mx-4 mb-3 rounded-xl border border-gold-400/20 bg-gradient-to-br from-gold-500/10 to-transparent p-3.5">
              <div className="mb-1.5 flex items-center gap-2">
                <ShieldCheck className="size-4 text-gold-300" strokeWidth={1.8} />
                <p className="text-xs font-semibold text-ivory-50">Certification GreenLeaves</p>
              </div>
              <p className="text-[11px] leading-relaxed text-forest-100/60">
                Audit terrain par un expert accrédité, dépôt du dossier au CNC.
              </p>
            </div>
          )}

          {/* Collapse */}
          <div className={cn('flex-shrink-0 border-t border-white/10 p-3', !expanded && 'flex justify-center')}>
            <button
              onClick={() => setExpanded(v => !v)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-forest-100/60 transition-colors hover:bg-white/[0.05] hover:text-ivory-50',
                expanded ? 'w-full' : 'size-11 justify-center px-0',
              )}
              aria-label={expanded ? 'Réduire le menu' : 'Déplier le menu'}
            >
              {expanded ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
              {expanded && 'Réduire le menu'}
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex flex-1 flex-col overflow-y-auto">
          <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center justify-between gap-4 border-b border-ivory-300/70 bg-ivory-100/85 px-6 backdrop-blur-md lg:px-10">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="text-ink-400">Espace entreprise</span>
              <span className="text-ivory-400">/</span>
              <span className="truncate font-semibold text-forest-900">{current?.label ?? 'Tableau de bord'}</span>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell portal="user" theme="light" />
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2.5 rounded-xl border border-transparent py-1 pl-1 pr-2 transition-colors hover:border-ivory-300 hover:bg-white focus:outline-none data-[state=open]:border-ivory-300 data-[state=open]:bg-white">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-forest-900 text-xs font-semibold text-gold-200">
                        {initials(user)}
                      </span>
                      <span className="hidden text-left leading-tight sm:block">
                        <span className="block text-[13px] font-semibold text-ink-800">{user.firstName} {user.lastName}</span>
                        <span className="block text-[11px] text-ink-400">{user.company?.name}</span>
                      </span>
                      <ChevronsUpDown className="size-3.5 text-ink-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      <p className="text-sm font-semibold text-ink-800">{user.firstName} {user.lastName}</p>
                      <p className="truncate text-xs font-normal text-ink-400">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => router.push('/dashboard/sites')}>
                      <Building2 /> Mes sites
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push('/dashboard/certifications')}>
                      <Award /> Mes certifications
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive onSelect={handleLogout}>
                      <LogOut /> Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-8 lg:px-10">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
