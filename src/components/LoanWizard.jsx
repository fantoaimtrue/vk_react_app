import './LoanWizard.css';

const LoanWizard = ({ onComplete, onCancel }) => {
    const handlePrioritySelection = (selectedPriority) => {
        onComplete(selectedPriority);
    };

    return (
        <div className="wizard-overlay">
            <div className="wizard-modal">
                <button onClick={onCancel} className="close-button">&times;</button>
                <div className="wizard-step">
                    <h2>Что для вас важнее всего?</h2>
                    <p>Мы подберем лучшие предложения, основываясь на вашем выборе.</p>
                    <div className="wizard-options">
                        <button onClick={() => handlePrioritySelection('rate')} className="wizard-option">
                            <span className="icon">💰</span>
                            <span className="title">Минимальная переплата</span>
                            <span className="description">Самая низкая процентная ставка</span>
                        </button>
                        <button onClick={() => handlePrioritySelection('speed')} className="wizard-option">
                            <span className="icon">⚡️</span>
                            <span className="title">Скорость получения</span>
                            <span className="description">Деньги на карте как можно быстрее</span>
                        </button>
                        <button onClick={() => handlePrioritySelection('approval')} className="wizard-option">
                            <span className="icon">✅</span>
                            <span className="title">Высокий шанс одобрения</span>
                            <span className="description">Максимальная вероятность получить деньги</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoanWizard; 
