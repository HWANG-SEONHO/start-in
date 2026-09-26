import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/main.css';
import { BrowserRouter } from 'react-router-dom';
import { AccountProvider } from './services/AccountContext';

createRoot(document.getElementById('root')).render(<BrowserRouter><AccountProvider><App /></AccountProvider></BrowserRouter>);
