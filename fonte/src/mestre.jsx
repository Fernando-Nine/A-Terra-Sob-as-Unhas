import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { PaginaMestre } from './PaginaMestre.jsx';

createRoot(document.getElementById('raiz')).render(<StrictMode><PaginaMestre /></StrictMode>);
