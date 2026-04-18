import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Register from './pages/Register.jsx';
import SeniorList from './pages/SeniorList.jsx';
import Waiting from './pages/Waiting.jsx';
import Dashboard from './pages/Dashboard.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/zapisz-sie" element={<Register />} />
        <Route path="/seniorzy-czekajacy" element={<SeniorList />} />
        <Route path="/oczekiwanie" element={<Waiting />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
