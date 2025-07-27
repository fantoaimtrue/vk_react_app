import React from 'react';
import './LoanCalculator.css';

const LoanCalculator = ({ amount, term, onAmountChange, onTermChange, maxAmount = 100000, maxTerm = 365 }) => {
    return (
        <div className="loan-calculator">
            <h3 className="calculator-title">Подберите лучшие условия</h3>
            <div className="calculator-inputs">
                <div className="input-group">
                    <label htmlFor="amount">Сумма (₽)</label>
                    <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => onAmountChange(Number(e.target.value))}
                        min="1000"
                        max={maxAmount}
                        step="500"
                    />
                    <input
                        type="range"
                        value={amount}
                        onChange={(e) => onAmountChange(Number(e.target.value))}
                        min="1000"
                        max={maxAmount}
                        step="500"
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="term">Срок (дней)</label>
                    <input
                        type="number"
                        id="term"
                        value={term}
                        onChange={(e) => onTermChange(Number(e.target.value))}
                        min="1"
                        max={maxTerm}
                        step="1"
                    />
                    <input
                        type="range"
                        value={term}
                        onChange={(e) => onTermChange(Number(e.target.value))}
                        min="1"
                        max={maxTerm}
                        step="1"
                    />
                </div>
            </div>
        </div>
    );
};

export default LoanCalculator; 