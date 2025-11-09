import React from 'react';
import './NotificationSubscriptionModal.css';

const NotificationSubscriptionModal = ({ onSubscribe, onClose, isLoading }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Заголовок с иконкой */}
                <div className="modal-header">
                    <div className="modal-icon">🎁</div>
                    <div className="promo-badge">ЭКСКЛЮЗИВНОЕ ПРЕДЛОЖЕНИЕ</div>
                </div>

                {/* Основной контент */}
                <div className="modal-body">
                    <h2 className="modal-title">Получите займ под 0%</h2>
                    <p className="modal-description">
                        Подпишитесь на уведомления и активируйте промокод
                    </p>

                    {/* Промокод */}
                    <div className="promo-code-container">
                        <div className="promo-code-label">Ваш промокод:</div>
                        <div className="promo-code">ФРИ</div>
                        <div className="promo-code-hint">Активируется при подписке</div>
                    </div>
                </div>

                {/* Кнопки действий */}
                <div className="modal-actions">
                    <button
                        className="btn-subscribe"
                        onClick={onSubscribe}
                        disabled={isLoading}
                    >
                        <span className="btn-icon">🔔</span>
                        <span className="btn-text">
                            {isLoading ? 'Активируем промокод...' : 'Подписаться и получить займ'}
                        </span>
                    </button>
                    <button className="btn-skip" onClick={onClose}>
                        <span className="btn-text">Позже</span>
                    </button>
                </div>

                {/* Кнопка закрытия */}
                <button className="btn-close" onClick={onClose} aria-label="Закрыть">
                    <span>×</span>
                </button>
            </div>
        </div>
    );
};

export default NotificationSubscriptionModal;