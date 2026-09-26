import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { PaginaFicha } from './PaginaFicha.jsx';

createRoot(document.getElementById('raiz')).render(<StrictMode><PaginaFicha /></StrictMode>);
