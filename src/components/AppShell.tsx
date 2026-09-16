import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { Header } from './Header'

export function AppShell() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <div className="mx-auto w-full max-w-lg flex-1 pb-[5.5rem]">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
