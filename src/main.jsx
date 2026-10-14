import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import HomePage from './pages/HomePage';
import BoardPage from './pages/BoardPage';
import './index.css';

function NotFound() {
  return (
    <main className="aurora flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-4xl text-white">페이지를 찾을 수 없어요</h1>
      <Link to="/" className="btn-primary">
        홈으로
      </Link>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/b/:slug" element={<BoardPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
