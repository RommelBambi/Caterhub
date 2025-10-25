import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Login from './pages/Login';
import Applications from './pages/Applications';
import ApplicationReview from './pages/ApplicationReview';
import Protected from './components/Protected';
import AdminShell from './pages/AdminShell';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/login', element: <Login /> },
  {
    path: '/admin',
    element: <Protected />,
    children: [
      {
        path: '',
        element: <AdminShell />,
        children: [
          { path: 'applications', element: <Applications /> },
          { path: 'applications/:id', element: <ApplicationReview /> },
        ]
      }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><RouterProvider router={router} /></React.StrictMode>
);
