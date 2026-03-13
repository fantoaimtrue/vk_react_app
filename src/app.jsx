import vkBridge from '@vkontakte/vk-bridge';
import { useEffect, useState } from 'react';
import { Route, HashRouter as Router, Routes, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import Footer from './components/Footer';
import Header from './components/Header';
import HelpModal from './components/HelpModal';
import NotificationSubscriptionModal from './components/NotificationSubscriptionModal';
import { TrackingProvider } from './contexts/TrackingContext';
import { usePushNotifications } from './hooks/usePushNotifications';
import useUTMTracker from './hooks/useUTMTracker';
import ArticlePage from './pages/ArticlePage';
import KnowledgeBase from './pages/KnowledgeBase';
import MFODetailWrapper from './pages/MFODetailWrapper';
import MFOHomeWithUTM from './pages/MFOHomeWithUTM';
import MFOUpload from './pages/MFOUpload';
import StatisticsPage from './pages/StatisticsPage';
import logger from './utils/logger';

function App() {
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Инициализация UTM трекера для отслеживания меток
  const { utmParams } = useUTMTracker();

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
        logger.info('✅ VK Bridge initialized successfully');
      } catch (error) {
        // VK Bridge may not be available when running outside VK app
        logger.warn('⚠️ VK Bridge initialization failed (not critical):', error);
      }
    };

    initVKBridge();
  }, []);

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

          <Header 
            onHelpClick={() => setShowHelpModal(true)} 
            promoApplied={promoApplied} 
          />

          <HelpModal 
            isOpen={showHelpModal} 
            onClose={() => setShowHelpModal(false)} 
          />

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

          <Footer />
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

  return null;
}

export default App;
