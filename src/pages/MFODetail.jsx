import React from 'react';
import './MFODetail.css';

const MFODetail = ({ mfo }) => {
    if (!mfo) {
        return <div>МФО не найдена</div>;
    }

    return (
        <div className="mfo-detail-card">
            <div className="mfo-header">
                <div className="mfo-logo-large">
                    <span role="img" aria-label="logo icon">🏦</span>
                </div>
                <h2 className="mfo-name-detail">{mfo.name}</h2>
            </div>
            <p className="mfo-description">{mfo.description}</p>

            <div className="mfo-params">
                <div className="param-item"><strong>Сумма:</strong> от {mfo.sum_min} до {mfo.sum_max} ₽</div>
                <div className="param-item"><strong>Срок:</strong> от {mfo.term_min} до {mfo.term_max} дней</div>
                <div className="param-item"><strong>Ставка:</strong> от {mfo.rate_min}% до {mfo.rate_max}% в день</div>
            </div>

            <div className="mfo-requirements">
                <h3>Требования к заемщику:</h3>
                <ul>
                    {mfo.requirements.map((req, index) => <li key={index}>{req}</li>)}
                </ul>
            </div>

            <div className="mfo-methods">
                <div>
                    <h3>Как получить деньги:</h3>
                    <ul>
                        {mfo.get_methods.map((method, index) => <li key={index}>{method}</li>)}
                    </ul>
                </div>
                <div>
                    <h3>Как вернуть деньги:</h3>
                    <ul>
                        {mfo.repay_methods.map((method, index) => <li key={index}>{method}</li>)}
                    </ul>
                </div>
            </div>

            <p className="mfo-license"><strong>Лицензия:</strong> {mfo.license}</p>

            <a href={mfo.link} target="_blank" rel="noopener noreferrer" className="apply-button">
                Оформить займ
            </a>
        </div>
    );
};

export default MFODetail; 