'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  Leaf, LayoutDashboard, Building2, ClipboardList, BarChart3, Settings,
  LogOut, PanelLeftClose, PanelLeftOpen, Award, Bot, ChevronsUpDown, ShieldCheck, Menu, X, Search,
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import CommandPalette from '@/components/CommandPalette'
import { FEATURES } from '@/lib/features'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
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
  { href: '/dashboard',                label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/sites',          label: 'Sites',           icon: Building2 },
  { href: '/dashboard/assessments',    label: 'Bilans carbone',  icon: ClipboardList },
  { href: '/dashboard/reports',        label: 'Rapports',        icon: BarChart3 },
  { href: '/dashboard/certifications', label: 'Certifications',  icon: Award },
  ...(FEATURES.aiAssistant ? [{ href: '/dashboard/assistant', label: 'Assistant IA', icon: Bot }] : []),
]
const SETTINGS_ITEM = { href: '/dashboard/settings', label: 'Paramètres', icon: Settings }
const COLLAPSE_KEY = 'ct.sidebar.collapsed'

function initials(u: UserData) {
  return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || u.email[0].toUpperCase()
}

const isActive = (pathname: string, href: string) =>
  pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserData | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    setExpanded(localStorage.getItem(COLLAPSE_KEY) !== '1')
  }, [])

  const toggleExpanded = () => {
    setExpanded(v => {
      localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0')
      return !v
    })
  }

  const loadUser = useCallback(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated')
        return res.json()
      })
      .then(data => {
        // Only company users belong here — send other roles to their own portal
        if (data.role === 'admin') return router.replace('/admin')
        if (data.role === 'expert') return router.replace('/expert')
        if (data.role !== 'user' || !data.company) return router.replace('/login')
        setUser(data)
      })
      .catch(() => router.replace('/login'))
  }, [router])

  useEffect(() => { loadUser() }, [loadUser])

  // Company name/logo edited in Paramètres → refresh the shell
  useEffect(() => {
    const onUpdate = () => loadUser()
    window.addEventListener('ct:company-updated', onUpdate)
    return () => window.removeEventListener('ct:company-updated', onUpdate)
  }, [loadUser])

  // Close the mobile drawer on navigation
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  // ⌘K / Ctrl+K opens the command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const current = [...NAV_ITEMS, SETTINGS_ITEM].find(i => isActive(pathname, i.href))

  return (
    <TooltipProvider>
      <div className="flex h-[100dvh] overflow-hidden bg-ivory-100 font-sans text-ink-800">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-forest-900 focus:px-4 focus:py-2 focus:text-ivory-50">
          Aller au contenu
        </a>

        {/* ── Desktop sidebar ── */}
        <aside
          className={cn(
            'relative z-20 hidden h-full flex-shrink-0 flex-col overflow-hidden bg-forest-900 bg-forest-grain text-ivory-100 transition-[width] duration-300 ease-out lg:flex',
            expanded ? 'w-[264px]' : 'w-[76px]',
          )}
        >
          <SidebarContent
            user={user}
            expanded={expanded}
            pathname={pathname}
            footer={
              <div className={cn('flex-shrink-0 border-t border-white/10 p-3', !expanded && 'flex justify-center')}>
                <button
                  onClick={toggleExpanded}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-forest-100/80 transition-colors hover:bg-white/[0.05] hover:text-ivory-50',
                    expanded ? 'w-full' : 'size-11 justify-center px-0',
                  )}
                  aria-label={expanded ? 'Réduire le menu' : 'Déplier le menu'}
                  aria-expanded={expanded}
                >
                  {expanded ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
                  {expanded && 'Réduire le menu'}
                </button>
              </div>
            }
          />
        </aside>

        {/* ── Mobile drawer ── */}
        <DialogPrimitive.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-forest-950/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 lg:hidden" />
            <DialogPrimitive.Content
              className="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[300px] flex-col bg-forest-900 bg-forest-grain font-sans text-ivory-100 shadow-lifted outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left lg:hidden"
            >
              <DialogPrimitive.Title className="sr-only">Menu de navigation</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">Accès aux sections de votre espace entreprise</DialogPrimitive.Description>
              <DialogPrimitive.Close className="absolute right-3 top-4 flex size-10 items-center justify-center rounded-xl text-forest-100/80 hover:bg-white/10 hover:text-ivory-50" aria-label="Fermer le menu">
                <X className="size-5" />
              </DialogPrimitive.Close>
              <SidebarContent
                user={user}
                expanded
                pathname={pathname}
                footer={
                  <div className="flex-shrink-0 border-t border-white/10 p-3">
                    <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-forest-100/80 hover:bg-white/[0.05] hover:text-ivory-50">
                      <LogOut className="size-4" /> Déconnexion
                    </button>
                  </div>
                }
              />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        {/* ── Main ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="z-30 flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-ivory-300/70 bg-ivory-100/90 px-4 backdrop-blur-md sm:px-6 lg:px-10">
            <div className="flex min-w-0 items-center gap-2">
              <button
                onClick={() => setDrawerOpen(true)}
                className="-ml-1 flex size-10 items-center justify-center rounded-xl text-forest-900 hover:bg-white lg:hidden"
                aria-label="Ouvrir le menu"
              >
                <Menu className="size-5" />
              </button>
              <Link href="/dashboard" className="flex items-center gap-2 lg:hidden" aria-label="CarbonTrack — tableau de bord">
                <span className="flex size-8 items-center justify-center rounded-lg bg-forest-900">
                  <Leaf className="size-4 text-gold-300" strokeWidth={1.8} />
                </span>
              </Link>
              <p className="hidden truncate text-sm font-semibold text-forest-900 sm:block lg:text-[15px]">
                {current?.label ?? 'Tableau de bord'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setPaletteOpen(true)}
                className="hidden h-10 items-center gap-2 rounded-xl border border-ivory-300 bg-white/70 pl-3 pr-2 text-sm text-ink-400 transition-colors hover:border-forest-300 hover:text-ink-700 md:flex"
                aria-label="Rechercher (Ctrl+K)"
              >
                <Search className="size-4" />
                <span className="w-40 text-left">Rechercher…</span>
                <kbd className="rounded-md border border-ivory-300 bg-ivory-100 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-ink-500">Ctrl K</kbd>
              </button>
              <button
                onClick={() => setPaletteOpen(true)}
                className="flex size-10 items-center justify-center rounded-xl text-ink-500 hover:bg-white hover:text-forest-900 md:hidden"
                aria-label="Rechercher"
              >
                <Search className="size-5" strokeWidth={1.8} />
              </button>
              <NotificationBell portal="user" theme="light" />
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2.5 rounded-xl border border-transparent py-1 pl-1 pr-1 transition-colors hover:border-ivory-300 hover:bg-white data-[state=open]:border-ivory-300 data-[state=open]:bg-white sm:pr-2" aria-label="Menu du compte">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-forest-900 text-xs font-semibold text-gold-200">
                        {initials(user)}
                      </span>
                      <span className="hidden text-left leading-tight sm:block">
                        <span className="block max-w-[160px] truncate text-[13px] font-semibold text-ink-800">{user.firstName} {user.lastName}</span>
                        <span className="block max-w-[160px] truncate text-[11px] text-ink-400">{user.company?.name}</span>
                      </span>
                      <ChevronsUpDown className="hidden size-3.5 text-ink-400 sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      <p className="text-sm font-semibold text-ink-800">{user.firstName} {user.lastName}</p>
                      <p className="truncate text-xs font-normal text-ink-400">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => router.push('/dashboard/settings')}>
                      <Settings /> Paramètres du compte
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
              ) : (
                <Skeleton className="size-10 rounded-xl" />
              )}
            </div>
          </header>

          <main id="main" className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
              {children}
            </div>
          </main>
        </div>

        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} navItems={[...NAV_ITEMS, SETTINGS_ITEM]} />
      </div>
    </TooltipProvider>
  )
}

function SidebarContent({
  user, expanded, pathname, footer,
}: { user: UserData | null; expanded: boolean; pathname: string; footer: React.ReactNode }) {
  return (
    <>
      {/* Brand */}
      <div className={cn('flex h-[72px] flex-shrink-0 items-center gap-3 px-5', !expanded && 'justify-center px-0')}>
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-gold-500/15 ring-1 ring-gold-400/40">
            <Leaf className="size-[18px] text-gold-300" strokeWidth={1.8} />
          </div>
          {expanded && (
            <div className="min-w-0 leading-tight">
              <p className="font-display text-[19px] font-medium tracking-tight text-ivory-50">CarbonTrack</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-300">Espace entreprise</p>
            </div>
          )}
        </Link>
      </div>

      {/* Company */}
      {expanded && (
        <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
          {user?.company ? (
            <>
              <div className="flex size-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ivory-50">
                {user.company.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={user.company.logoUrl} alt="" className="h-full w-full object-contain p-1" />
                  : <Building2 className="size-4 text-forest-700" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-ivory-50">{user.company.name}</p>
                <p className="text-[11px] text-forest-100/80">Organisation</p>
              </div>
            </>
          ) : (
            <div className="h-9 w-full animate-pulse rounded-lg bg-white/[0.06]" />
          )}
        </div>
      )}

      {/* Nav */}
      <nav className={cn('flex flex-1 flex-col gap-1 overflow-y-auto', expanded ? 'px-3' : 'items-center px-2')} aria-label="Navigation principale">
        {expanded && (
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-forest-100/70">Navigation</p>
        )}
        {[...NAV_ITEMS, SETTINGS_ITEM].map((item, i) => {
          const active = isActive(pathname, item.href)
          const isSettings = item.href === SETTINGS_ITEM.href
          return (
            <Tooltip key={item.href} content={item.label} disabled={expanded}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400',
                  expanded ? 'px-3 py-2.5' : 'size-11 justify-center',
                  isSettings && i > 0 && 'mt-3',
                  active ? 'bg-white/[0.08] text-ivory-50' : 'text-forest-100/80 hover:bg-white/[0.05] hover:text-ivory-50',
                )}
              >
                {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gold-400" />}
                <item.icon
                  className={cn('size-[18px] flex-shrink-0', active ? 'text-gold-300' : 'text-forest-200/80 group-hover:text-ivory-100')}
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
            <p className="text-xs font-semibold text-ivory-50">Parcours de certification</p>
          </div>
          <p className="text-[11px] leading-relaxed text-forest-100/80">
            Audit terrain par un expert accrédité GreenLeaves, dépôt du dossier et certificat délivré par le CNC.
          </p>
        </div>
      )}

      {footer}
    </>
  )
}
