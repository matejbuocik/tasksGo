import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CookiesProvider } from 'react-cookie'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CookiesProvider>
        <App />
      </CookiesProvider>
    </QueryClientProvider>
  </StrictMode>,
)
