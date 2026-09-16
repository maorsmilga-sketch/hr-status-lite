import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { Header } from './Header'

export function AppShell() {
  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col overflow-hidden bg-transparent">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
