import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { DataProvider } from './context/DataContext.jsx'
import { AppearanceProvider } from './context/AppearanceContext.jsx'

class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('Application render error:', error, info); }
  render() {
    if (this.state.error) return <main style={{ padding: 32, fontFamily: 'system-ui', color: '#0f172a' }}><h1>Không thể hiển thị trang này</h1><p>Lỗi: {this.state.error.message}</p><button onClick={() => window.location.reload()} style={{ padding: '10px 16px' }}>Tải lại trang</button></main>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary><AppearanceProvider><DataProvider><App /></DataProvider></AppearanceProvider></AppErrorBoundary>
  </StrictMode>,
)
