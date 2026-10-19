import { createRoot } from 'react-dom/client'

export function mountLab(App) {
  createRoot(document.getElementById('root')).render(<App />)
}
