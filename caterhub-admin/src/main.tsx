// caterhub-admin/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import App from './App'
import Login from './pages/Login'
import Applications from './pages/Applications'
import ApplicationReview from './pages/ApplicationReview'
import Apply from './partners/Apply'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/applications" element={<Applications />} />
        <Route path="/admin/applications/:id" element={<ApplicationReview />} />
        <Route path="/partners/apply" element={<Apply />} />
        <Route path="*" element={<div style={{padding:24}}>
          <h2>Not Found</h2>
          <p><Link to="/login">Go to Login</Link></p>
        </div>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
