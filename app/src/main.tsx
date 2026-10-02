import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { WeekStoreProvider } from './store/useWeekStore';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <WeekStoreProvider>
      <App />
    </WeekStoreProvider>
  </BrowserRouter>,
);
