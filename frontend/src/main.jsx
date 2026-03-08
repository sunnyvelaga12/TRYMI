// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/frontend/components/App.jsx'
import "@/frontend/styles/index.css"
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { Toaster } from '@/frontend/components/ui/toaster'

// Optional: Import ProductsContext if you created it
// import { ProductsProvider } from '@/frontend/context/ProductsContext'

// Enhanced error handling
const renderApp = () => {
  const rootElement = document.getElementById('root')

  // Check if root element exists
  if (!rootElement) {
    console.error('Root element not found! Make sure you have <div id="root"></div> in your HTML.')
    return
  }

  try {
    const root = ReactDOM.createRoot(rootElement)

    root.render(
      <React.StrictMode>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ChakraProvider value={defaultSystem}>
            {/* Optional: Wrap with ProductsProvider for shared state */}
            {/* <ProductsProvider> */}
            <App />
            <Toaster />
            {/* </ProductsProvider> */}
          </ChakraProvider>
        </BrowserRouter>
      </React.StrictMode>,
    )
  } catch (error) {
    console.error('Failed to render app:', error)

    // Fallback rendering
    rootElement.innerHTML = `
      <div style="
        display: flex; 
        flex-direction: column; 
        justify-content: center; 
        align-items: center; 
        min-height: 100vh; 
        background: #1a1a1a; 
        color: #ef4444; 
        font-family: 'Inter', Arial, sans-serif; 
        text-align: center;
        padding: 20px;
      ">
        <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">🚫 TRYMI App Failed to Load</h1>
        <p style="font-size: 1.1rem; color: #9ca3af; margin-bottom: 0.5rem;">There was an error starting the application.</p>
        <p style="font-size: 0.9rem; color: #6b7280;">Check the browser console for details.</p>
        <pre style="
          background: #262626; 
          color: #ef4444; 
          padding: 1rem; 
          border-radius: 8px; 
          margin-top: 1rem; 
          max-width: 600px; 
          overflow-x: auto;
          text-align: left;
          font-size: 0.85rem;
        ">${error.message}</pre>
        <button 
          onclick="window.location.reload()" 
          style="
            background: #10b981; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 8px; 
            cursor: pointer; 
            margin-top: 20px;
            font-size: 1rem;
            font-weight: 600;
            transition: all 0.2s;
          "
          onmouseover="this.style.background='#059669'"
          onmouseout="this.style.background='#10b981'"
        >
          Reload Page
        </button>
      </div>
    `
  }
}

// Development hot reload support - SIMPLIFIED
if (import.meta.hot) {
  import.meta.hot.accept()
}

// Initialize the app
renderApp()

// Development helpers
if (import.meta.env.DEV) {
  console.log('🎨 TRYMI Development Mode Active')
  console.log('📁 Running from:', window.location.origin)
  console.log('🔗 API Base URL: http://localhost:3000') // ✅ CHANGED from 5000 to 3000

  // Performance monitoring
  if (typeof performance !== 'undefined') {
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0]
      if (perfData) {
        console.log(`⚡ TRYMI loaded in ${perfData.loadEventEnd.toFixed(2)}ms`)
      }
    })
  }
}
