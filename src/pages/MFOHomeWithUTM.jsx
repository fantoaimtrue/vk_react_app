import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import LoanCalculator from '../components/LoanCalculator';
import LoanWizard from '../components/LoanWizard';
import MFOCardWithUTM from '../components/MFOCardWithUTM';
import { useMFOs } from '../hooks/useMFOs';
import useUTMTracker from '../hooks/useUTMTracker';
import { trackEvent } from '../utils/vkEvents';
import logger from '../utils/logger';
import './MFOHome.css';

const INITIAL_ITEMS_TO_SHOW = 9;
const ITEMS_PER_LOAD = 9;

const MFOHomeWithUTM = () => {
    console.log('🔴 [MFOHomeWithUTM] Компонент рендерится');
    logger.info('🔴 [MFOHomeWithUTM] Компонент рендерится');
    
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [amount, setAmount] = useState(15000);
    const [term, setTerm] = useState(15);
    const [itemsToShow, setItemsToShow] = useState(INITIAL_ITEMS_TO_SHOW);
    const [sortPriority, setSortPriority] = useState('approval');
    const [isTracking, setIsTracking] = useState(false);

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

    useEffect(() => {
        const state = {
            loading,
            error,
            filteredMfosCount: filteredMfos?.length || 0,
            itemsToShow,
            amount,
            term,
            utmLoading,
            isUserDataReady,
            utmParams: Object.keys(utmParams || {}).length
        };
        logger.info('📊 [MFOHomeWithUTM] Состояние:', state);
        if (!loading && !error && filteredMfos && filteredMfos.length > 0) {
            logger.info(`✅ [MFOHomeWithUTM] Готово к рендерингу: ${filteredMfos.length} офферов`);
        }
    }, [loading, error, filteredMfos?.length, itemsToShow, amount, term, utmLoading, isUserDataReady, utmParams]);

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
            sub6: filterValue(userData.id || getUTMParam('vk_user_id') || getUTMParam('user_id') || ''),
            ref_source: filterValue(getUTMParam('utm_source') || getUTMParam('vk_ref_source') || getUTMParam('ref_source') || ''),
            user_id: filterValue(userData.id || getUTMParam('vk_user_id') || getUTMParam('user_id') || ''),
            // Если utm_source не определен, используем 'vk_mini_app' по умолчанию
            utm_source: filterValue(getUTMParam('utm_source') || 'vk_mini_app'),
            utm_medium: filterValue(getUTMParam('utm_medium') || ''),
            utm_campaign: filterValue(getUTMParam('utm_campaign') || getUTMParam('ref_campaign') || ''),
            utm_content: filterValue(getUTMParam('utm_content') || ''),
            utm_term: filterValue(getUTMParam('utm_term') || '')
        };
        
        // Логируем для отладки
        logger.debug('🔍 [generateMFOLink] additionalParams:', additionalParams);
        console.log('🔍 [generateMFOLink] additionalParams:', additionalParams);
        
        return generateLinkWithUTM(mfo.link, additionalParams);
    }, [generateLinkWithUTM, getUTMParam, userData]);

    const handleMFOClick = useCallback(async (mfo) => {
        if (isTracking) return;
        setIsTracking(true);
        try {
            const link = generateMFOLink(mfo);
            if (userData && userData.id) {
                trackEvent({ eventName: 'lead', userId: userData.id });
            }
            await fetch('/api/utm-track/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    utm_params: utmParams,
                    user_data: userData,
                    event_type: 'mfo_click',
                    mfo_data: { id: mfo.id, name: mfo.name, link: link },
                    timestamp: new Date().toISOString(),
                    url: window.location.href
                })
            });
            window.open(link, '_blank');
        } catch (error) {
            logger.error('❌ Ошибка при клике на МФО:', error);
            window.open(mfo.link, '_blank');
        } finally {
            setIsTracking(false);
        }
    }, [generateLinkWithUTM, utmParams, userData, isTracking]);

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
                <div className="offers-loading-spinner"></div>
                <p className="offers-loading-text">Загрузка предложений...</p>
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
            <div style={{ padding: '0 10px', maxWidth: '100%', boxSizing: 'border-box' }}>
                {/* Кнопка для открытия/закрытия калькулятора */}
                <div style={{ textAlign: 'center', marginBottom: '20px', padding: '20px' }}>
                    <button 
                        onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
                        className={`open-calculator-button ${isCalculatorOpen ? 'calculator-open' : ''}`}
                        style={{
                            background: isCalculatorOpen 
                                ? 'linear-gradient(135deg, #DC5A2A 0%, #ED713C 100%)' 
                                : 'linear-gradient(135deg, #ED713C 0%, #DC5A2A 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '16px 32px',
                            fontSize: '1.1em',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(237, 113, 60, 0.4)',
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
                                // Закрываем калькулятор сразу
                                setIsCalculatorOpen(false);
                                
                                // Ждем завершения анимации закрытия калькулятора перед скроллом
                                // Это предотвращает двойной скачок: сначала калькулятор закрывается,
                                // затем выполняется плавный скролл к списку офферов
                                setTimeout(() => {
                                    const mfoListElement = document.querySelector('.mfo-list');
                                    if (mfoListElement) {
                                        const elementRect = mfoListElement.getBoundingClientRect();
                                        const elementTop = elementRect.top + window.pageYOffset;
                                        const offset = 100; // Отступ от верха экрана
                                        
                                        // Выполняем скролл только один раз после закрытия калькулятора
                                        window.scrollTo({
                                            top: Math.max(0, elementTop - offset),
                                            behavior: 'smooth'
                                        });
                                    }
                                }, 450); // Время анимации закрытия калькулятора (400ms) + небольшой запас
                            }}
                        >
                            Показать предложения
                        </button>
                    </div>
                </div>

                <div className="mfo-list" style={{ marginTop: '20px', scrollMarginTop: '100px' }}>
                    {filteredMfos && filteredMfos.length > 0 ? (
                        filteredMfos.slice(0, itemsToShow).map((mfo) => (
                            <MFOCardWithUTM
                                key={mfo.id}
                                mfo={mfo}
                                requestedAmount={amount}
                                requestedTerm={term}
                                onClick={() => handleMFOClick(mfo)}
                                isLoading={utmLoading || isTracking}
                                isDataReady={isUserDataReady || !!utmParams.utm_term}
                            />
                        ))
                    ) : (
                        <div style={{ padding: '40px', textAlign: 'center' }}>
                            <h3>Предложения не найдены</h3>
                            <p>Попробуйте изменить параметры займа или сбросить фильтры.</p>
                            <button onClick={() => { setAmount(15000); setTerm(15); fetchMfos(); }} className="retry-button" style={{ marginTop: '20px' }}>
                                Сбросить фильтры
                            </button>
                        </div>
                    )}
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
