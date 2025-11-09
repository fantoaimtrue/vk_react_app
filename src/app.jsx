import vkBridge from '@vkontakte/vk-bridge';
import React, { useEffect, useState } from 'react';
import { Link, Route, HashRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import NotificationSubscriptionModal from './components/NotificationSubscriptionModal';
import useArbitrageTracker from './hooks/useArbitrageTracker';
import { usePushNotifications } from './hooks/usePushNotifications';
import useUTMTracker from './hooks/useUTMTracker';
import ArticlePage from './pages/ArticlePage';
import KnowledgeBase from './pages/KnowledgeBase';
import MFODetailWrapper from './pages/MFODetailWrapper';
import MFOHomeWithUTM from './pages/MFOHomeWithUTM';
import MFOUpload from './pages/MFOUpload';

function App() {
  console.log('--- App Component Render START ---');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Инициализация UTM трекера для отслеживания меток
  const {
    utmParams,
    isLoading: utmLoading,
    error: utmError,
    userData,
    generateLinkWithUTM
  } = useUTMTracker();

  // Инициализация арбитражного трекера для leads.tech
  const {
    autoSendOnUTMChange,
  } = useArbitrageTracker();

  // Инициализация пуш-уведомлений с модальным окном подписки
  const {
    showModal,
    isLoading,
    handleSubscribe,
    handleClose,
    promoApplied,
  } = usePushNotifications(utmParams);

  useEffect(() => {
    vkBridge.send('VKWebAppInit');
  }, []);

  useEffect(() => {
    if (userData && utmParams && Object.keys(utmParams).length > 0) {
      console.log('📊 Отправляем данные в leads.tech:', { userData, utmParams });
      autoSendOnUTMChange(userData, utmParams);
    }
  }, [userData, utmParams, autoSendOnUTMChange]);

  // ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ: Показываем загрузчик, пока UTM трекер не завершит работу
  if (utmLoading) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#2c2c2e' }}>
            <div className="loading-spinner"></div>
        </div>
    );
  }
  
  console.log('--- App Component Before Return ---');
  return (
    <Router>
      <div className="app-container">
        {/* Модальное окно подписки на уведомления */}
        {showModal && (
          <NotificationSubscriptionModal
            isLoading={isLoading}
            onSubscribe={handleSubscribe}
            onClose={handleClose}
          />
        )}

        <header className="app-header">
          <div className="header-left">
            <img src="/logo.png" alt="БАБКИМАНКИ Лого" className="header-logo" />
            <div className="header-brand">
              <h1 className="header-title">БАБКИМАНКИ</h1>
              <p className="header-slogan">дает займ, когда отказали банки</p>
              {promoApplied && (
                <div className="promo-badge-header">
                  🎁 Промокод ФРИ применен
                </div>
              )}
            </div>
          </div>
          <div className="header-right">
            <button
              onClick={() => setShowHelpModal(true)}
              className="header-help-button"
            >
              Мне не дают займ
            </button>
            <a
              href="https://vk.me/babkimonkey"
              target="_blank"
              rel="noopener noreferrer"
              className="header-bot-button"
            >
              Бот ВК
            </a>
          </div>
        </header>


        {/* Модальное окно справки */}
        {showHelpModal && (
          <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowHelpModal(false)}>×</button>
              <h2 className="modal-title">Почему отказывают в займе?</h2>
              <div className="modal-body">
                <div className="help-tip">
                  <h3>Подавайте заявки в несколько МФО</h3>
                  <p>Оставляйте заявки сразу в <strong>3-4 сервисах</strong>. Это значительно увеличивает шансы на одобрение, так как у каждой компании свои критерии оценки.</p>
                </div>
                <div className="help-tip">
                  <h3>Доход указывайте больше 300К</h3>
                  <p><strong>МФО это не проверяют.</strong> Указывайте ежемесячный доход от 300 000 рублей - это повышает шанс одобрения.</p>
                </div>
                <div className="help-tip">
                  <h3>Заполняйте все поля анкеты</h3>
                  <p>Чем полнее информация о вас, тем выше вероятность одобрения. Указывайте контактные данные, место работы и другие сведения.</p>
                </div>
                <div className="help-tip">
                  <h3>Используйте наш бот</h3>
                  <p>В нашем боте вы получите персональные рекомендации и эксклюзивные предложения.</p>
                  <a
                    href="https://vk.me/babkimonkey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="modal-bot-link"
                  >
                    Перейти в бот ВК
                  </a>
                </div>
              </div>
              <button
                className="modal-understand-button"
                onClick={() => setShowHelpModal(false)}
              >
                Понятно
              </button>
            </div>
          </div>
        )}

        <main className="app-main">
          <Routes>
            <Route path="/" element={<MFOHomeWithUTM />} />
            <Route path="/mfo/:id" element={<MFODetailWrapper />} />
            <Route path="/kb" element={<KnowledgeBase />} />
            <Route path="/kb/:articleId" element={<ArticlePage />} />
            <Route path="/upload" element={<MFOUpload />} />
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