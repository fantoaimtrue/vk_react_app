import React, { memo, useMemo } from 'react';
import './MFOCard.css';

const MFOCardWithUTM = ({
    mfo,
    requestedAmount = 15000,
    requestedTerm = 15,
    onClick,
    showUTMInfo = false,
    utmParams = {},
    isLoading = false,
    isDataReady = false
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

    // Определяем, является ли ставка нулевой или очень низкой
    const isZeroRate = mfo.rate === 0 || mfo.rate < 0.1;
    const isFastPayout = mfo.payout_speed_hours && mfo.payout_speed_hours <= 1;
    const isHighApproval = mfo.approval_chance && mfo.approval_chance >= 95;

    // Логика для кнопки
    let buttonText = 'Получить займ';
    let isButtonDisabled = !isEligible;

    if (isLoading) {
        buttonText = 'Загрузка данных...';
        isButtonDisabled = true;
    } else if (!isEligible) {
        buttonText = 'Не подходит по условиям';
        isButtonDisabled = true;
    }
    // Убрали проверку isDataReady - кнопка работает всегда

    // Определяем цвет прогресс-бара и текста шанса одобрения
    const getApprovalColor = (chance) => {
        if (chance >= 80) return 'success';
        if (chance >= 50) return 'warning';
        return 'low';
    };

    const approvalColor = mfo.approval_chance ? getApprovalColor(mfo.approval_chance) : 'success';
    const approvalChance = mfo.approval_chance || 0;
    
    // Время выдачи от 5 до 8 минут (фиксированное для каждой карточки на основе ID)
    const payoutMinutes = useMemo(() => {
        // Используем ID МФО для генерации стабильного значения от 5 до 8
        const idHash = (mfo.id || 0).toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return (idHash % 4) + 5; // Всегда от 5 до 8
    }, [mfo.id]);

    return (
        <div className={`mfo-card-new ${isEligible ? '' : 'ineligible'}`}>
            <div className="mfo-card-header-new">
                <div className="mfo-logo-new">
                    {mfo.logo_url ? (
                        <img 
                            src={mfo.logo_url} 
                            alt={`${mfo.name} logo`} 
                            className="mfo-logo-img-new"
                            loading="lazy"
                        />
                    ) : (
                        <div className="mfo-logo-placeholder-new">{mfo.name.charAt(0)}</div>
                    )}
                </div>
                <div className="mfo-info-new">
                    <h3 className="mfo-name-new">{mfo.name}</h3>
                    {isEligible && approvalChance > 0 && (
                        <div className="mfo-approval-progress">
                            <span className="approval-label">Шанс одобрения</span>
                            <div className="approval-progress-bar" data-state={approvalColor === 'success' ? 'high' : approvalColor === 'warning' ? 'mid' : 'low'}>
                                <i 
                                    className={`approval-progress-fill approval-${approvalColor}`}
                                    style={{ width: `${approvalChance}%`, '--p': `${approvalChance}%` }}
                                ></i>
                            </div>
                            <span className={`approval-percent approval-${approvalColor}`}>{approvalChance}%</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="mfo-card-body-new">
                <div className="loan-details-grid">
                    <div className="detail-box">
                        <span className="detail-label-new">СУММА</span>
                        <span className="detail-value-new">
                            {mfo.sum_min?.toLocaleString() || 0} - {mfo.sum_max?.toLocaleString() || 0}{'\u00A0'}₽
                        </span>
                    </div>
                    <div className="detail-box">
                        <span className="detail-label-new">СРОК</span>
                        <span className="detail-value-new">
                            {mfo.term_min || 0} - {mfo.term_max || 0} дней
                        </span>
                    </div>
                    <div className="detail-box">
                        <span className="detail-label-new">СТАВКА</span>
                        <span className={`detail-value-new ${isZeroRate ? 'highlight-zero' : ''}`}>
                            {mfo.rate || 0} в день
                        </span>
                    </div>
                    <div className="detail-box">
                        <span className="detail-label-new">ВЫПЛАТА</span>
                        <span className="detail-value-new highlight-fast">
                            {payoutMinutes} мин
                        </span>
                    </div>
                </div>

                {isEligible && (
                    <div className="loan-calculation-box-new">
                        <div className="calculation-row">
                            <span className="calc-label-new">Сумма займа:</span>
                            <span className="calc-value-new">{requestedAmount.toLocaleString()}{'\u00A0'}₽</span>
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
