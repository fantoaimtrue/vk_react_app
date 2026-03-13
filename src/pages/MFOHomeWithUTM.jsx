import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoanCalculator from '../components/LoanCalculator';
import LoanWizard from '../components/LoanWizard';
import MFOCardWithUTM from '../components/MFOCardWithUTM';
import { useTracking } from '../contexts/useTracking';
import { useMFOs } from '../hooks/useMFOs';
import useUTMTracker from '../hooks/useUTMTracker';
import useArbitrageTracker from '../hooks/useArbitrageTracker';
import logger from '../utils/logger';
import { SkeletonCardList } from '../components/SkeletonCard';
import LoadingSpinner from '../components/LoadingSpinner';
import AnimatedCard from '../components/AnimatedCard';
import './MFOHome.css';

const INITIAL_ITEMS_TO_SHOW = 9;
const ITEMS_PER_LOAD = 9;

const MFOHomeWithUTM = () => {
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [amount, setAmount] = useState(15000);
    const [term, setTerm] = useState(15);
    const [itemsToShow, setItemsToShow] = useState(INITIAL_ITEMS_TO_SHOW);
    const [sortPriority, setSortPriority] = useState('api');

    // Таймер на 10 минут (600 секунд)
    const [timeLeft, setTimeLeft] = useState(() => {
        const savedStartTime = sessionStorage.getItem('timerStartTime');
        const now = Date.now();
        if (savedStartTime) {
            const elapsed = Math.floor((now - parseInt(savedStartTime)) / 1000);
            return Math.max(0, 600 - elapsed);
        } else {
            sessionStorage.setItem('timerStartTime', now.toString());
            return 600;
        }
    });

    useEffect(() => {
        if (timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    const formatTime = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Добавляем/убираем класс на body при открытии/закрытии калькулятора
    useEffect(() => {
        if (isCalculatorOpen) {
            document.body.classList.add('calculator-open');
        } else {
            document.body.classList.remove('calculator-open');
        }
        return () => {
            document.body.classList.remove('calculator-open');
        };
    }, [isCalculatorOpen]);

    const {
        utmParams,
        userData,
        isLoading: utmLoading,
        isUserDataReady,
        generateLinkWithUTM,
        getUTMParam,
    } = useUTMTracker();

    const {
        mfoList: filteredMfos,
        loading,
        error,
        maxLoanAmount,
        fetchMfos
    } = useMFOs({ amount, term, sortPriority });

    // Инициализация арбитражного трекера для leads.tech
    const {
        sendToLeadsTech,
    } = useArbitrageTracker();

    // Получаем tracking данные для добавления sub4/sub5
    const { buildUrl } = useTracking();

    // Убрали избыточный useEffect с логированием для оптимизации

    const loadMoreRef = useRef(null);

    const generateMFOLink = useCallback((mfo) => {
        if (!mfo.link) return '#';
        const filterValue = (value) => {
            if (!value) return '';
            const lowerValue = String(value).toLowerCase();
            if (['other', 'test', 'unknown', 'null', 'undefined', 'none', ''].includes(lowerValue)) {
                return '';
            }
            return value;
        };
        const additionalParams = {
            ref: filterValue(getUTMParam('utm_campaign') || getUTMParam('vk_ref') || getUTMParam('ref') || getUTMParam('vk_ad_id') || getUTMParam('ad_id') || ''),
            ref_campaign: filterValue(getUTMParam('ref_campaign') || getUTMParam('campaign_id') || ''),
            ref_ad: filterValue(getUTMParam('ref_ad') || getUTMParam('ad_id') || getUTMParam('vk_ad_id') || ''),
            sub6: filterValue(userData.id || getUTMParam('vk_user_id') || getUTMParam('user_id') || getUTMParam('utm_term') || ''),
            // ИСПРАВЛЕНИЕ: Используем utm_source как fallback для ref_source если ref_source пуст
            ref_source: filterValue(getUTMParam('ref_source') || getUTMParam('vk_ref_source') || getUTMParam('utm_source') || 'vk_mini_app'),
            // ИСПРАВЛЕНИЕ: Добавляем utm_term как fallback для user_id
            user_id: filterValue(userData.id || getUTMParam('vk_user_id') || getUTMParam('user_id') || getUTMParam('utm_term') || ''),
            // Если utm_source не определен, используем 'vk_mini_app' по умолчанию
            utm_source: filterValue(getUTMParam('utm_source') || 'vk_mini_app'),
            utm_medium: filterValue(getUTMParam('utm_medium') || ''),
            utm_campaign: filterValue(getUTMParam('utm_campaign') || getUTMParam('ref_campaign') || ''),
            utm_content: filterValue(getUTMParam('utm_content') || ''),
            utm_term: filterValue(getUTMParam('utm_term') || '')
        };

        return generateLinkWithUTM(mfo.link, additionalParams);
    }, [generateLinkWithUTM, getUTMParam, userData]);

    // Простая функция отправки аналитики в фоне (не блокирует клик)
    const sendAnalytics = useCallback(async (mfo, link) => {
        try {
            // Отправляем все запросы параллельно, не ждем результата
            Promise.allSettled([
                // UTM tracking
                fetch('/api/utm-track/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        utm_params: utmParams,
                        user_data: userData,
                        event_type: 'mfo_click',
                        mfo_data: { id: mfo.id, name: mfo.name, link },
                        timestamp: new Date().toISOString(),
                        url: window.location.href
                    })
                }),

                // Leads.tech tracking (только если есть offer_id)
                mfo.id ? sendToLeadsTech(userData, utmParams, { offer_id: mfo.id }) : Promise.resolve()
            ]).then(results => {
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        logger.debug(`Analytics ${index} failed:`, result.reason);
                    }
                });
            });
        } catch (err) {
            // Ошибки аналитики не критичны, просто логируем
            logger.debug('Analytics error:', err);
        }
    }, [utmParams, userData, sendToLeadsTech]);

    const handleMFOClick = useCallback((mfo) => {
        try {
            logger.info('🔵 Клик на МФО:', mfo.name);

            // 1. Генерируем ссылку с UTM параметрами
            const link = buildUrl(generateMFOLink(mfo));
            logger.info('🔗 Открываем ссылку:', link);

            // 2. Открываем ссылку СРАЗУ (синхронно, без await)
            const win = window.open(link, '_blank');

            if (!win) {
                // Если pop-up заблокирован браузером
                logger.warn('⚠️ Pop-up заблокирован, используем location.href');
                window.location.href = link;
            } else {
                logger.info('✅ Ссылка открыта в новой вкладке');
            }

            // 3. Отправляем аналитику в фоне (не ждем результата)
            sendAnalytics(mfo, link);

        } catch (error) {
            logger.error('❌ Ошибка при клике:', error);
            // Fallback: открываем базовую ссылку без UTM
            try {
                window.open(mfo.link, '_blank');
            } catch (fallbackError) {
                logger.error('❌ Даже fallback не сработал:', fallbackError);
            }
        }
    }, [generateMFOLink, buildUrl, sendAnalytics]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && itemsToShow < filteredMfos.length) {
                    setItemsToShow(prev => Math.min(prev + ITEMS_PER_LOAD, filteredMfos.length));
                }
            },
            { threshold: 0.1 }
        );
        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }
        return () => observer.disconnect();
    }, [itemsToShow, filteredMfos.length]);

    if (loading && !filteredMfos?.length) {
        return (
            <div className="offers-loading-container">
                <LoadingSpinner size="large" text="Загрузка предложений..." />
                <div className="mfo-list" style={{ marginTop: '20px' }}>
                    <SkeletonCardList count={6} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <h2>Ошибка загрузки</h2>
                <p>{error}</p>
                <button onClick={fetchMfos} className="retry-button">Попробовать снова</button>
            </div>
        );
    }

    return (
        <>
            {isWizardOpen && (
                <LoanWizard
                    onComplete={(priority) => {
                        setSortPriority(priority);
                        setIsWizardOpen(false);
                    }}
                    onCancel={() => setIsWizardOpen(false)}
                />
            )}
            <div className="main-content-wrapper">
                {!isCalculatorOpen && (
                    <>
                        {/* Информационный блок с таймером */}
                        <div className={`timer-info-block ${timeLeft > 0 ? 'timer-active' : 'timer-expired'}`}>
                            <span className="timer-info-text">
                                Вам одобрены эти займы. <br />
                                Свободные лимиты актуальны <span className="timer-countdown">{formatTime(timeLeft)}</span> мин.
                            </span>
                        </div>

                        <div className="recommendation-block">
                            <span className="recommendation-title">Рекомендация</span>
                            <p className="recommendation-text">Отправьте заявку минимум в 4 компании для 100% получения денег!</p>
                        </div>
                    </>
                )}

                {/* Кнопка для открытия/закрытия калькулятора */}
                <div style={{ textAlign: 'center', padding: '10px 20px' }} className="calculator-button-wrapper">
                    <button
                        onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
                        className={`open-calculator-button ${isCalculatorOpen ? 'calculator-open' : ''}`}
                        style={{
                            background: '#fcc400',
                            color: '#333',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px 24px',
                            fontSize: '1em',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(252, 196, 0, 0.4)',
                            transition: 'all 0.3s ease',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <span>{isCalculatorOpen ? 'Скрыть калькулятор' : 'Выбрать сумму и срок'}</span>
                        <span style={{
                            transition: 'transform 0.3s ease',
                            transform: isCalculatorOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            display: 'inline-block'
                        }}>▼</span>
                    </button>
                </div>

                {/* Калькулятор с анимацией появления */}
                <div className={`calculator-slide-container ${isCalculatorOpen ? 'calculator-visible' : ''}`}>
                    <div className="calculator-slide-content">
                        <LoanCalculator
                            amount={amount}
                            onAmountChange={setAmount}
                            term={term}
                            onTermChange={setTerm}
                            maxAmount={maxLoanAmount}
                            maxTerm={90}
                        />
                        <button
                            className="calculator-show-offers-button"
                            onClick={() => {
                                // Закрываем калькулятор
                                setIsCalculatorOpen(false);

                                // Ждем завершения анимации закрытия (350ms) + небольшой запас
                                // чтобы скролл происходил ПОСЛЕ того, как калькулятор полностью закрылся
                                // Это предотвращает двойной скачок
                                setTimeout(() => {
                                    const mfoListElement = document.querySelector('.mfo-list');

                                    if (mfoListElement) {
                                        // Получаем позицию элемента после закрытия калькулятора
                                        const rect = mfoListElement.getBoundingClientRect();
                                        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                                        const elementTop = rect.top + scrollTop;
                                        const offset = 100; // Отступ от верха экрана

                                        // Выполняем скролл один раз, после закрытия калькулятора
                                        window.scrollTo({
                                            top: Math.max(0, elementTop - offset),
                                            behavior: 'smooth'
                                        });
                                    }
                                }, 400); // Время анимации закрытия + запас для обновления DOM
                            }}
                        >
                            Показать предложения
                        </button>
                    </div>
                </div>

                <div className="mfo-list" style={{ marginTop: '10px', scrollMarginTop: '100px' }}>
                    <AnimatePresence mode="popLayout">
                        {filteredMfos && filteredMfos.length > 0 ? (
                            filteredMfos.slice(0, itemsToShow).map((mfo, index) => (
                                <AnimatedCard key={mfo.id} index={index}>
                                    <MFOCardWithUTM
                                        mfo={mfo}
                                        requestedAmount={amount}
                                        requestedTerm={term}
                                        onClick={() => handleMFOClick(mfo)}
                                        isLoading={utmLoading}
                                        isDataReady={isUserDataReady || !!utmParams.utm_term}
                                    />
                                </AnimatedCard>
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1' }}
                            >
                                <h3>Предложения не найдены</h3>
                                <p>Попробуйте изменить параметры займа или сбросить фильтры.</p>
                                <button onClick={() => { setAmount(15000); setTerm(15); fetchMfos(); }} className="retry-button" style={{ marginTop: '20px' }}>
                                    Сбросить фильтры
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {itemsToShow < filteredMfos.length && (
                    <div ref={loadMoreRef} className="offers-load-more-container">
                        <div className="offers-load-more-spinner"></div>
                        <p className="offers-load-more-text">Загружаем еще предложения...</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default MFOHomeWithUTM;
