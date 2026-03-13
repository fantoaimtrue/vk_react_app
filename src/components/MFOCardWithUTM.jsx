import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './MFOCard.css';

const MFOCardWithUTM = ({
    mfo,
    requestedAmount = 15000,
    requestedTerm = 15,
    onClick,
    showUTMInfo = false,
    utmParams = {},
    isLoading = false
}) => {
    const isEligible =
        requestedAmount >= mfo.sum_min &&
        requestedAmount <= mfo.sum_max &&
        requestedTerm >= mfo.term_min &&
        requestedTerm <= mfo.term_max;

    const calculateOverpayment = () => {
        const dailyRate = typeof mfo.rate === 'number' ? mfo.rate / 100 : 0;
        const overpayment = requestedAmount * dailyRate * requestedTerm;
        return Math.round(overpayment);
    };

    const totalAmount = requestedAmount + calculateOverpayment();

    // Логика для кнопки
    let buttonText = 'Получить';
    let isButtonDisabled = !isEligible;

    if (isLoading) {
        buttonText = 'Загрузка данных...';
        isButtonDisabled = true;
    } else if (!isEligible) {
        buttonText = 'Не подходит по условиям';
        isButtonDisabled = true;
    }
    // Убрали проверку isDataReady - кнопка работает всегда

    // Время выдачи от 5 до 8 минут (фиксированное для каждой карточки на основе ID)
    const payoutMinutes = useMemo(() => {
        // Используем ID МФО для генерации стабильного значения от 5 до 8
        const idHash = (mfo.id || 0).toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return (idHash % 4) + 5; // Всегда от 5 до 8
    }, [mfo.id]);

    // Лимит от 2 до 15 (фиксированное для каждой карточки на основе ID)
    const limitValue = useMemo(() => {
        const idHash = (mfo.id || 0).toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return (idHash % 14) + 2; // Всегда от 2 до 15
    }, [mfo.id]);

    // Логика индикатора лимитов (максимум 15)
    const batteryConfig = useMemo(() => {
        if (limitValue > 10) {
            return { segments: 2, color: '#fcc400' }; // Желтый
        } else if (limitValue >= 5) {
            return { segments: 1, color: '#FF8A00' }; // Оранжевый
        } else {
            return { segments: 1, color: '#EF4444' }; // Красно-оранжевый
        }
    }, [limitValue]);

    // Состояние для показа/скрытия деталей займа
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className={`mfo-card-new ${isEligible ? '' : 'ineligible'}`}>
            {/* Изображение на всю ширину карточки */}
            <div className="mfo-image-container-new">
                {mfo.logo_url ? (
                    <img
                        src={mfo.logo_url}
                        alt={`${mfo.name} logo`}
                        className="mfo-image-full-new"
                        loading="lazy"
                    />
                ) : (
                    <div className="mfo-image-placeholder-new">{mfo.name.charAt(0)}</div>
                )}
            </div>

            {/* Информация под изображением */}
            <div className="mfo-card-header-new">
                <div className="mfo-info-new">
                    <div className="mfo-chance-label">
                        <span className="chance-text">Шанс</span>
                        <span className="chance-status">ВЫСОКИЙ</span>
                    </div>
                </div>
            </div>

            <div className="mfo-card-body-new">
                <button
                    className="mfo-conditions-button"
                    onClick={() => setShowDetails(!showDetails)}
                    type="button"
                >
                    {showDetails ? 'Скрыть условия' : 'Условия'}
                    <span className={`mfo-conditions-icon ${showDetails ? 'open' : ''}`}>▼</span>
                </button>

                <AnimatePresence>
                    {showDetails && (
                        <motion.div
                            className="loan-details-grid"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                        >
                            <div className="detail-box">
                                <span className="detail-label-new">СУММА</span>
                                <span className="detail-value-new">
                                    {mfo.sum_min?.toLocaleString() || 0} - {mfo.sum_max?.toLocaleString() || 0}{'\u00A0'}₽
                                </span>
                            </div>
                            <div className="detail-box">
                                <span className="detail-label-new">СРОК</span>
                                <span className="detail-value-new">
                                    {mfo.term_min || 0} - {mfo.term_max || 0}<span className="detail-value-unit-full"> дней</span><span className="detail-value-unit-short"> дн</span>
                                </span>
                            </div>
                            <div className="detail-box">
                                <span className="detail-label-new">СТАВКА</span>
                                <span className="detail-value-new highlight-green">
                                    {mfo.rate || 0}%
                                </span>
                            </div>
                            <div className="detail-box">
                                <span className="detail-label-new">ВЫПЛАТА</span>
                                <span className="detail-value-new highlight-green">
                                    {payoutMinutes} мин
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {isEligible && (
                    <div className="loan-calculation-box-new">
                        <div className="calculation-row">
                            <span className="calc-label-new">Сумма:</span>
                            <span className="calc-value-new">{requestedAmount.toLocaleString()}{'\u00A0'}₽</span>
                        </div>
                        <div className="calculation-row calculation-limit-row">
                            <div className="limit-label-container">
                                <span className="limit-label-text">Свободные</span>
                                <span className="limit-label-text">лимиты</span>
                            </div>
                            <div className="battery-container">
                                <span className="battery-value">{limitValue}</span>
                                <div className="battery-outer">
                                    <div className="battery-body">
                                        {[1, 2, 3].map((s) => (
                                            <div
                                                key={s}
                                                className="battery-segment"
                                                style={{
                                                    backgroundColor: s <= batteryConfig.segments ? batteryConfig.color : 'transparent'
                                                }}
                                            ></div>
                                        ))}
                                    </div>
                                    <div className="battery-cap"></div>
                                </div>
                            </div>
                        </div>
                        <div className="calculation-row">
                            <span className="calc-label-new">Переплата:</span>
                            <span className="calc-value-new">{calculateOverpayment().toLocaleString()}{'\u00A0'}₽</span>
                        </div>
                        <div className="calculation-row calculation-total-new">
                            <span className="calc-label-new">К возврату:</span>
                            <span className="calc-value-new calc-total-value">{totalAmount.toLocaleString()}{'\u00A0'}₽</span>
                        </div>
                    </div>
                )}

                <button
                    className={`mfo-button-new ${isButtonDisabled ? 'disabled' : ''}`}
                    onClick={onClick}
                    onTouchStart={(e) => {
                        // Улучшаем отклик на touch для мобильных устройств
                        if (!isButtonDisabled) {
                            e.currentTarget.style.opacity = '0.8';
                        }
                    }}
                    onTouchEnd={(e) => {
                        if (!isButtonDisabled) {
                            e.currentTarget.style.opacity = '1';
                        }
                    }}
                    disabled={isButtonDisabled}
                    type="button"
                >
                    {buttonText}
                </button>
            </div>

            {showUTMInfo && Object.keys(utmParams).length > 0 && (
                <div className="utm-debug-info">
                    <small>UTM: {JSON.stringify(utmParams)}</small>
                </div>
            )}
        </div>
    );
};

export default memo(MFOCardWithUTM);
