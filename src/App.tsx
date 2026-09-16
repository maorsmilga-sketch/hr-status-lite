import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AdminDashboard, AdminGate } from './pages/AdminPage'
import { ShiftsPage } from './pages/ShiftsPage'
import { SoldierPage } from './pages/SoldierPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<SoldierPage />} />
          <Route path="/shifts" element={<ShiftsPage />} />
          <Route
            path="/admin"
            element={
              <AdminGate>
                <AdminDashboard />
              </AdminGate>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
