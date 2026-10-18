import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './style.css'

const icon = document.createElement('link')
icon.rel = 'icon'
icon.type = 'image/svg+xml'
icon.href = `${import.meta.env.BASE_URL.replace(/labs\/$/, '')}favicon.svg`
document.head.append(icon)

createRoot(document.getElementById('root')).render(<App />)
