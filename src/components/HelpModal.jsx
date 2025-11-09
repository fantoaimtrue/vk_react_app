import React from 'react';
import './HelpModal.css';

const HelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Мне нигде не одобряют займ</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="help-section">
                        <h3>📋 Улучшите анкету</h3>
                        <ul>
                            <li>Указывайте доход от 500 000 рублей - МФО не могут это проверить, а шанс одобрения выше</li>
                            <li>Добавьте дополнительные контакты</li>
                            <li>Убедитесь в корректности всех данных</li>
                        </ul>
                    </div>

                    <div className="help-section">
                        <h3>💰 Начните с малых сумм</h3>
                        <p>Попробуйте получить займ на меньшую сумму и короткий срок. Это повысит шансы одобрения.</p>
                    </div>

                    <div className="help-section">
                        <h3>🔄 Подавайте заявки в 3-4 сервисах сразу</h3>
                        <p>Одновременная подача заявок в несколько МФО увеличивает шансы на одобрение. Выберите 3-4 подходящих сервиса и подайте заявки в один день.</p>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="modal-button" onClick={onClose}>
                        Понятно
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HelpModal;
