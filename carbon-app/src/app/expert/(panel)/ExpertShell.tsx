'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  UserCheck, LayoutDashboard, Award, LogOut,
  Menu, X, ChevronRight, User
} from 'lucide-react'
import LoadingScreen from '@/components/LoadingScreen'
import NotificationBell from '@/components/NotificationBell'

interface ExpertUser {
  id: number
  email: string
  firstName: string
  lastName: string
}

export default function ExpertShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<ExpertUser | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me?portal=expert')
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated')
        return res.json()
      })
      .then(data => {
        if (data.role !== 'expert') {
          router.push('/expert/login')
          return
        }
        setUser(data)
        setLoading(false)
      })
      .catch(() => {
        router.push('/expert/login')
      })
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/expert/login')
  }

  const navItems = [
    { href: '/expert', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/expert/certifications', label: 'Certifications', icon: Award },
  ]

  if (loading) return <LoadingScreen theme="dark" label="Espace Expert" />

  return (
    <div className="h-screen overflow-hidden bg-gray-950 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-[72px]'} bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 flex-shrink-0 h-screen overflow-hidden z-20`}>

        {/* Logo */}
        <div className="px-3 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <Link href="/expert" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight">CarbonTrack</p>
                <p className="text-[11px] text-gray-500 leading-tight">Espace Expert</p>
              </div>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 flex flex-col gap-0.5 overflow-hidden">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/expert' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!sidebarOpen ? item.label : undefined}
                className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-colors
                  ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
                  ${!sidebarOpen ? 'justify-center' : ''}`}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {sidebarOpen && <span className="flex-1 truncate">{item.label}</span>}
                {sidebarOpen && isActive && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-2 border-t border-gray-800 flex-shrink-0">
          {sidebarOpen && user && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 mb-0.5 rounded-xl">
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">{user.firstName} {user.lastName}</p>
                <p className="text-[10px] text-gray-500 truncate leading-tight">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={!sidebarOpen ? 'Déconnexion' : undefined}
            className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors w-full ${!sidebarOpen ? 'justify-center' : ''}`}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {sidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main content — scroll here, never in sidebar */}
      <main className="flex-1 overflow-y-auto bg-gray-950 flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-6 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 rounded-sm shadow-sm" viewBox="0 0 3 2" aria-label="Gabon">
              <rect width="3" height="0.67" fill="#009E60" />
              <rect y="0.66" width="3" height="0.67" fill="#FCD116" />
              <rect y="1.33" width="3" height="0.67" fill="#3A75C4" />
            </svg>
            <span className="text-xs text-gray-500 hidden sm:inline">République Gabonaise</span>
          </div>
          <NotificationBell portal="expert" theme="dark" />
        </div>
        <div className="p-6 flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}
