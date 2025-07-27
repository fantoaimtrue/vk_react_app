import React from 'react';
import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import ArticlePage from './pages/ArticlePage';
import KnowledgeBase from './pages/KnowledgeBase';
import MFODetailWrapper from './pages/MFODetailWrapper';
import MFOHome from './pages/MFOHome';

function App() {
  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <h1>
            <img src="/logo.png" alt="БАБКИМАНКИ Лого" className="logo-img" />
            БАБКИМАНКИ
          </h1>
          <p className="slogan">дает займ, когда отказали банки</p>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<MFOHome />} />
            <Route path="/mfo/:id" element={<MFODetailWrapper />} />
            <Route path="/kb" element={<KnowledgeBase />} />
            <Route path="/kb/:articleId" element={<ArticlePage />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <Link to="/kb" className="footer-link">База знаний</Link>
          <div className="disclaimer">
            <p>Сервис "БАБКИМАНКИ" не является финансовым учреждением, банком или кредитором. Услуги посредника предоставляет ООО "ЛИДСТЕХ". ПСК 0% - 292%.</p>
            <p>Информация на сайте: бабкиманки.рф</p>
          </div>
          <p className="copyright">&copy; 2025 БАБКИМАНКИ. Все права защищены.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;