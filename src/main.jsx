import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/index.css'

// Load only the selected application. The isolated field-test build must not
// invoke the connected Base44/AuthProvider boot path while offline.
const entry = import.meta.env.VITE_WAVERADAR_ISOLATED_FIELD_TEST === '1'
  ? import('./FieldTestApp.jsx')
  : import('@/App.jsx')

entry.then(({ default: Root }) => {
  ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
}).catch(error => {
  console.error('[WaveRadar] entry failed to load', error)
  document.getElementById('root').textContent = 'WaveRadar could not load its local application files.'
})
