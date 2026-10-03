import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErrorNotice } from './components/ErrorNotice'
import { BaggageProvider } from './state/BaggageProvider'
import { CloudSyncProvider } from './state/CloudSyncProvider'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Missing #root element')
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <ErrorNotice />
      <BaggageProvider>
        <CloudSyncProvider>
          <App />
        </CloudSyncProvider>
      </BaggageProvider>
    </ErrorBoundary>
  </StrictMode>,
)