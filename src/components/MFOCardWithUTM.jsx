import React, { memo } from 'react';
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
    } else if (!isDataReady) {
        buttonText = 'Ошибка: нет ID';
        isButtonDisabled = true;
    } else if (!isEligible) {
        buttonText = 'Не подходит по условиям';
        isButtonDisabled = true;
    }

    return (
        <div className={`mfo-card ${isEligible ? '' : 'ineligible'}`}>
            <div className="mfo-card-header">
                <div className="mfo-logo">
                    {mfo.logo_url ? (
                        <img src={mfo.logo_url} alt={`${mfo.name} logo`} className="mfo-logo-img" />
                    ) : (
                        <div className="mfo-logo-placeholder">{mfo.name.charAt(0)}</div>
                    )}
                </div>
                <div className="mfo-info">
                    <h3 className="mfo-name">{mfo.name}</h3>
                    {isEligible && mfo.approval_chance && (
                        <div className="mfo-approval-highlight">
                            <span className="approval-text">Шанс одобрения:</span>
                            <span className="approval-percent">{mfo.approval_chance}%</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="mfo-card-body">
                <div className="loan-details-compact">
                    <div className="detail-item">
                        <div className="detail-content">
                            <span className="detail-label">Сумма</span>
                            <span className="detail-value">
                                {mfo.sum_min?.toLocaleString() || 0} - {mfo.sum_max?.toLocaleString() || 0} ₽
                            </span>
                        </div>
                    </div>
                    <div className="detail-item">
                        <div className="detail-content">
                            <span className="detail-label">Срок</span>
                            <span className="detail-value">
                                {mfo.term_min || 0} - {mfo.term_max || 0} дней
                            </span>
                        </div>
                    </div>
                    <div className="detail-item">
                        <div className="detail-content">
                            <span className="detail-label">Ставка</span>
                            <span className={`detail-value ${isZeroRate ? 'highlight-zero' : ''}`}>
                                {mfo.rate || 0}% в день
                            </span>
                        </div>
                    </div>
                    <div className="detail-item">
                        <div className="detail-content">
                            <span className="detail-label">Выплата</span>
                            <span className={`detail-value ${isFastPayout ? 'highlight-fast' : ''}`}>
                                {Math.round((mfo.payout_speed_hours || 0) * 60)} мин
                            </span>
                        </div>
                    </div>
                </div>

                {isEligible && (
                    <div className="loan-calculation-box">
                        <div className="calculation-item">
                            <span className="calc-label">Сумма займа:</span>
                            <span className="calc-value">{requestedAmount.toLocaleString()} ₽</span>
                        </div>
                        <div className="calculation-item">
                            <span className="calc-label">Переплата:</span>
                            <span className="calc-value">{calculateOverpayment().toLocaleString()} ₽</span>
                        </div>
                        <div className="calculation-total">
                            <span className="total-label">К возврату:</span>
                            <span className="total-value">{totalAmount.toLocaleString()} ₽</span>
                        </div>
                    </div>
                )}

                <button
                    className={`mfo-button-new ${isButtonDisabled ? 'disabled' : ''}`}
                    onClick={onClick}
                    disabled={isButtonDisabled}
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
