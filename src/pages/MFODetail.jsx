import React from 'react';
import './MFODetail.css';

const MFODetail = ({ mfo }) => {
    // Временно используем прямую ссылку без VK Bridge для тестирования
    const dynamicLink = mfo.link;
    const linkLoading = false;

    if (!mfo) {
        return <div>МФО не найдена</div>;
    }

    // Данные уже преобразованы в MFODetailWrapper через mapDjangoMfo
    const requirements = Array.isArray(mfo.requirements) ? mfo.requirements : [];
    const getMethods = Array.isArray(mfo.get_methods) ? mfo.get_methods : [];
    const repayMethods = Array.isArray(mfo.repay_methods) ? mfo.repay_methods : [];

    return (
        <div className="mfo-detail-card">
            <div className="mfo-header">
                <div className="mfo-logo-large">
                    {mfo.logo_url ? (
                        <img src={mfo.logo_url} alt={`${mfo.name} логотип`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                        <span role="img" aria-label="logo icon">🏦</span>
                    )}
                </div>
                <h2 className="mfo-name-detail">{mfo.name}</h2>
            </div>

            <div className="mfo-params">
                <div className="param-item"><strong>Сумма:</strong> от {mfo.sum_min.toLocaleString()} до {mfo.sum_max.toLocaleString()} ₽</div>
                <div className="param-item"><strong>Срок:</strong> от {mfo.term_min} до {mfo.term_max} дней</div>
                <div className="param-item"><strong>Ставка:</strong> {mfo.rate}% в день</div>
                <div className="param-item"><strong>Шанс одобрения:</strong> {mfo.approval_chance}%</div>
                <div className="param-item"><strong>Скорость выплаты:</strong> {Math.round(mfo.payout_speed_hours * 60)} минут</div>
            </div>

            {requirements.length > 0 && (
                <div className="mfo-requirements">
                    <h3>Требования к заемщику:</h3>
                    <ul>
                        {requirements.map((req, index) => <li key={index}>{req.trim()}</li>)}
                    </ul>
                </div>
            )}

            <div className="mfo-methods">
                {getMethods.length > 0 && (
                    <div>
                        <h3>Как получить деньги:</h3>
                        <ul>
                            {getMethods.map((method, index) => <li key={index}>{method.trim()}</li>)}
                        </ul>
                    </div>
                )}
                {repayMethods.length > 0 && (
                    <div>
                        <h3>Как вернуть деньги:</h3>
                        <ul>
                            {repayMethods.map((method, index) => <li key={index}>{method.trim()}</li>)}
                        </ul>
                    </div>
                )}
            </div>

            <a
                href={dynamicLink || mfo.link}
                target="_blank"
                rel="noopener noreferrer"
                className="apply-button"
                style={{ opacity: linkLoading ? 0.7 : 1 }}
            >
                {linkLoading ? 'Загрузка ссылки...' : 'Оформить займ'}
            </a>
        </div>
    );
};

export default MFODetail; 