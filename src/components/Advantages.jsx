import React from 'react';
import './Advantages.css';

const advantagesList = [
    { icon: '📜', text: 'Не смотрим на кредитную историю. Даём шанс каждому.' },
    { icon: '🔒', text: 'Фиксированный процент — никаких сюрпризов при возврате.' },
    { icon: '🛡️', text: 'Ваши данные под защитой — используем те же технологии, что и банки.' },
    { icon: '🌍', text: 'Онлайн-сервис. Доступен по всей России.' }
];

const Advantages = () => {
    return (
        <div className="advantages-section">
            <div className="advantages-grid">
                {advantagesList.map((advantage, index) => (
                    <div key={index} className="advantage-item">
                        <span className="advantage-icon">{advantage.icon}</span>
                        <p className="advantage-text">{advantage.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Advantages; 