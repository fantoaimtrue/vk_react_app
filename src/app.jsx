import vkBridge from '@vkontakte/vk-bridge';
import React, { useEffect, useState } from 'react';
import { Link, Route, HashRouter as Router, Routes, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import NotificationSubscriptionModal from './components/NotificationSubscriptionModal';
import { TrackingProvider } from './contexts/TrackingContext';
import useArbitrageTracker from './hooks/useArbitrageTracker';
import { usePushNotifications } from './hooks/usePushNotifications';
import useUTMTracker from './hooks/useUTMTracker';
import ArticlePage from './pages/ArticlePage';
import KnowledgeBase from './pages/KnowledgeBase';
import MFODetailWrapper from './pages/MFODetailWrapper';
import MFOHomeWithUTM from './pages/MFOHomeWithUTM';
import MFOUpload from './pages/MFOUpload';
import StatisticsPage from './pages/StatisticsPage';

function App() {
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Блокируем прокрутку body когда модальное окно открыто
  useEffect(() => {
    if (showHelpModal) {
      // Сохраняем текущую позицию прокрутки
      const scrollY = window.scrollY;
      // Блокируем прокрутку body
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        // Восстанавливаем прокрутку body
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showHelpModal]);

  // Инициализация UTM трекера для отслеживания меток
  const {
    utmParams,
    isLoading: utmLoading,
    error: utmError,
    userData,
    generateLinkWithUTM
  } = useUTMTracker();

  // Арбитражный трекер больше не используется автоматически в App.jsx
  // Теперь он вызывается только при клике на конкретное MFO с offer_id

  // Инициализация пуш-уведомлений с модальным окном подписки
  const {
    showModal,
    isLoading,
    handleSubscribe,
    handleClose,
    promoApplied,
  } = usePushNotifications(utmParams);

  // Initialize VK Bridge with proper error handling
  useEffect(() => {
    const initVKBridge = async () => {
      try {
        await vkBridge.send('VKWebAppInit');
        console.log('✅ VK Bridge initialized successfully');
      } catch (error) {
        // VK Bridge may not be available when running outside VK app
        console.warn('⚠️ VK Bridge initialization failed (not critical):', error);
      }
    };

    initVKBridge();
  }, []);

  // Убрали автоматический вызов autoSendOnUTMChange
  // Теперь leads.tech получает данные только при клике на конкретное MFO

  // Сохраняем оригинальный hash ДО того, как HashRouter его изменит
  useEffect(() => {
    const originalHash = window.location.hash;
    if (originalHash && originalHash !== '#' && originalHash !== '#/') {
      sessionStorage.setItem('originalHash', originalHash);
    }
  }, []);

  return (
    <TrackingProvider>
      <Router>
        <HashRouterFix />
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
                <button className="modal-close" onClick={() => setShowHelpModal(false)} aria-label="Закрыть">×</button>
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
                <div className="modal-footer">
                  <button
                    className="modal-understand-button"
                    onClick={() => setShowHelpModal(false)}
                  >
                    Понятно
                  </button>
                </div>
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
              <Route path="/stats" element={<StatisticsPage />} />
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
    </TrackingProvider>
  );
}

// Компонент для исправления hash для HashRouter
function HashRouterFix() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // НЕ нормализуем hash сразу - это может помешать извлечению параметров
    // Вместо этого просто убеждаемся, что мы на главной странице
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
  }, [navigate, location]);

  // НЕ нормализуем hash - пусть useUTMTracker извлекает параметры из оригинального hash
  // HashRouter должен работать с hash как есть, даже если он содержит только параметры
  // Если hash содержит параметры без /, HashRouter все равно должен распознать маршрут "/"

  return null;
}

export default App;