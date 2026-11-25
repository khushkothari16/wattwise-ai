import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Appliances from './pages/Appliances'
import Analytics from './pages/Analytics'
import BillEstimator from './pages/BillEstimator'
import Chat from './pages/Chat'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="appliances" element={<Appliances />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="bills" element={<BillEstimator />} />
            <Route path="chat" element={<Chat />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1f2937', color: '#f9fafb', border: '1px solid #374151' },
        }}
      />
    </QueryClientProvider>
  )
}
