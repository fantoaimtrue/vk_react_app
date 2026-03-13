import './NotificationSubscriptionModal.css';

const NotificationSubscriptionModal = ({ onSubscribe, onClose, isLoading }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Заголовок */}
                <div className="modal-header">
                    <h2 className="modal-title">Подпишитесь на уведомления</h2>
                    <p className="modal-description">
                        Получите промокод <span className="promo-code-inline">ФРИ</span> для займа под 0%
                    </p>
                </div>

                {/* Кнопки действий */}
                <div className="modal-actions">
                    <button
                        className="btn-subscribe"
                        onClick={onSubscribe}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Подписываемся...' : 'Подписаться'}
                    </button>
                    <button className="btn-skip" onClick={onClose}>
                        Позже
                    </button>
                </div>

                {/* Кнопка закрытия */}
                <button className="btn-close" onClick={onClose} aria-label="Закрыть">
                    ×
                </button>
            </div>
        </div>
    );
};

export default NotificationSubscriptionModal;
