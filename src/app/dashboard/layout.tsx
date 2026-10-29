'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Leaf, LayoutDashboard, Building2, ClipboardList, BarChart3,
  LogOut, Menu, X, ChevronRight, User, Award, Bot,
} from 'lucide-react'
import LoadingScreen from '@/components/LoadingScreen'
import NotificationBell from '@/components/NotificationBell'
import { FEATURES } from '@/lib/features'

interface UserData {
  id: number
  email: string
  firstName: string
  lastName: string
  phone: string
  company: { id: number; name: string; logoUrl: string | null }
  role: string
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserData | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
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

  const navItems = [
    { href: '/dashboard',                  label: 'Tableau de bord',     icon: LayoutDashboard },
    { href: '/dashboard/sites',            label: 'Sites & Entités',     icon: Building2 },
    { href: '/dashboard/assessments',      label: 'Bilans Carbone',      icon: ClipboardList },
    { href: '/dashboard/reports',          label: 'Rapports & Graphiques', icon: BarChart3 },
    { href: '/dashboard/certifications',   label: 'Bilans Certifiés',    icon: Award },
    ...(FEATURES.aiAssistant ? [{ href: '/dashboard/assistant', label: 'Assistant IA', icon: Bot }] : []),
  ]

  if (loading) return <LoadingScreen theme="light" label="Chargement du tableau de bord" />

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-[72px]'} bg-white border-r border-gray-100 flex flex-col transition-all duration-300 flex-shrink-0 h-screen overflow-hidden z-20`}>

        {/* Logo */}
        <div className="px-3 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
              {user?.company?.logoUrl
                ? <img src={user.company.logoUrl} alt={user.company.name} className="h-full w-auto object-contain" />
                : <div className="w-9 h-9 bg-brand-600 flex items-center justify-center rounded-xl"><Leaf className="w-5 h-5 text-white" /></div>}
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate leading-tight">{user?.company?.name || 'CarbonTrack'}</p>
                <p className="text-[11px] text-gray-400 leading-tight">CarbonTrack</p>
              </div>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 flex flex-col gap-0.5 overflow-hidden">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-colors
                  ${isActive ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}
                  ${!sidebarOpen ? 'justify-center' : ''}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {sidebarOpen && <span className="flex-1 truncate">{item.label}</span>}
                {sidebarOpen && isActive && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-2 border-t border-gray-100 flex-shrink-0">
          {sidebarOpen && user && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 mb-0.5 rounded-xl">
              <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{user.firstName} {user.lastName}</p>
                <p className="text-[10px] text-gray-400 truncate leading-tight">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={!sidebarOpen ? 'Déconnexion' : undefined}
            className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full ${!sidebarOpen ? 'justify-center' : ''}`}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {sidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main — scroll here, never in sidebar */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 px-6 py-2 flex items-center justify-end flex-shrink-0">
          <NotificationBell portal="user" theme="light" />
        </div>
        <div className="p-6 flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}
