'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Award, LogOut, Menu, X, ChevronRight,
  User, FileCheck, BarChart3, Settings, ScrollText, Building2,
} from 'lucide-react'
import LoadingScreen from '@/components/LoadingScreen'
import NotificationBell from '@/components/NotificationBell'

interface CncUser {
  id: number
  email: string
  firstName: string
  lastName: string
  role: string
}

export default function CncShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<CncUser | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me?portal=cnc')
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated')
        return res.json()
      })
      .then(data => {
        if (data.role !== 'cnc') {
          router.push('/cnc/login')
          return
        }
        setUser(data)
        setLoading(false)
      })
      .catch(() => {
        router.push('/cnc/login')
      })
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/cnc/login')
  }

  const navItems = [
    { href: '/cnc', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/cnc/certifications', label: 'Certifications', icon: FileCheck },
    { href: '/cnc/certificats', label: 'Certificats émis', icon: Award },
    { href: '/cnc/entreprises', label: 'Entreprises', icon: Building2 },
    { href: '/cnc/statistiques', label: 'Statistiques', icon: BarChart3 },
    { href: '/cnc/parametres', label: 'Paramètres', icon: Settings },
  ]

  if (loading) return <LoadingScreen theme="light" label="Espace CNC" logoUrl="/cnc-logo.png" brand="CNC" />

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex">
      {/* ── Sidebar ── */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-[72px]'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 flex-shrink-0 h-screen overflow-hidden z-20 shadow-sm`}>
        {/* Logo */}
        <div className="px-3 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <Link href="/cnc" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
              <img src="/cnc-logo.png" alt="CNC" className="w-8 h-8 object-contain" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-sm font-bold text-emerald-700 leading-tight">CNC</p>
                <p className="text-[10px] text-emerald-700 font-semibold leading-tight">Conseil National du Climat</p>
              </div>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-300 hover:text-emerald-600 p-1 rounded-lg hover:bg-emerald-50 transition-colors flex-shrink-0"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-hidden">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/cnc' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!sidebarOpen ? item.label : undefined}
                className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-transparent'}
                  ${!sidebarOpen ? 'justify-center' : ''}`}
              >
                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-emerald-600' : ''}`} />
                {sidebarOpen && <span className="flex-1 truncate">{item.label}</span>}
                {sidebarOpen && isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-2 border-t border-gray-100 flex-shrink-0">
          {sidebarOpen && user && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 mb-0.5 rounded-xl">
              <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{user.firstName} {user.lastName}</p>
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

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 px-6 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 rounded-sm shadow-sm" viewBox="0 0 3 2" aria-label="Gabon">
              <rect width="3" height="0.67" fill="#009E60" />
              <rect y="0.66" width="3" height="0.67" fill="#FCD116" />
              <rect y="1.33" width="3" height="0.67" fill="#3A75C4" />
            </svg>
            <span className="text-xs text-gray-400 hidden sm:inline">République Gabonaise</span>
          </div>
          <NotificationBell portal="cnc" theme="light" />
        </div>
        <div className="p-6 flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}
