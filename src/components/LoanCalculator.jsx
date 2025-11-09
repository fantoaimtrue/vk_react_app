import React from 'react';
import './LoanCalculator.css';

const LoanCalculator = ({ amount, term, onAmountChange, onTermChange, maxAmount = 100000, maxTerm = 90 }) => {

    const handleAmountChange = (e) => {
        const value = e.target.value;
        if (value === '' || value === null) {
            onAmountChange('');
            return;
        }
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            onAmountChange(Math.max(1000, Math.min(maxAmount, numValue)));
        }
    };

    const handleTermChange = (e) => {
        const value = e.target.value;
        if (value === '' || value === null) {
            onTermChange('');
            return;
        }
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            onTermChange(Math.max(1, Math.min(maxTerm, numValue)));
        }
    };

    const incrementAmount = () => {
        const currentAmount = Number(amount) || 1000;
        const newAmount = Math.min(maxAmount, currentAmount + 1000);
        onAmountChange(newAmount);
    };

    const decrementAmount = () => {
        const currentAmount = Number(amount) || 1000;
        const newAmount = Math.max(1000, currentAmount - 1000);
        onAmountChange(newAmount);
    };

    const incrementTerm = () => {
        const currentTerm = Number(term) || 1;
        const newTerm = Math.min(maxTerm, currentTerm + 1);
        onTermChange(newTerm);
    };

    const decrementTerm = () => {
        const currentTerm = Number(term) || 1;
        const newTerm = Math.max(1, currentTerm - 1);
        onTermChange(newTerm);
    };

    return (
        <div className="loan-calculator">
            <h3 className="calculator-title">Подберите лучшие условия</h3>
            <div className="calculator-inputs">
                <div className="input-group">
                    <label htmlFor="amount">СУММА (₽)</label>
                    <div className="input-with-buttons">
                        <button
                            type="button"
                            className="calc-button calc-minus"
                            onClick={decrementAmount}
                            disabled={Number(amount) <= 1000}
                        >
                            −
                        </button>
                        <input
                            type="text"
                            inputMode="numeric"
                            id="amount"
                            value={amount === '' ? '' : amount}
                            onChange={handleAmountChange}
                            onBlur={() => {
                                if (amount === '' || amount < 1000) {
                                    onAmountChange(1000);
                                }
                            }}
                            placeholder="15000"
                        />
                        <button
                            type="button"
                            className="calc-button calc-plus"
                            onClick={incrementAmount}
                            disabled={Number(amount) >= maxAmount}
                        >
                            +
                        </button>
                    </div>
                    <input
                        type="range"
                        value={amount === '' ? 1000 : amount}
                        onChange={(e) => onAmountChange(Number(e.target.value))}
                        min="1000"
                        max={maxAmount}
                        step="1000"
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="term">СРОК (ДНЕЙ)</label>
                    <div className="input-with-buttons">
                        <button
                            type="button"
                            className="calc-button calc-minus"
                            onClick={decrementTerm}
                            disabled={Number(term) <= 1}
                        >
                            −
                        </button>
                        <input
                            type="text"
                            inputMode="numeric"
                            id="term"
                            value={term === '' ? '' : term}
                            onChange={handleTermChange}
                            onBlur={() => {
                                if (term === '' || term < 1) {
                                    onTermChange(1);
                                }
                            }}
                            placeholder="15"
                        />
                        <button
                            type="button"
                            className="calc-button calc-plus"
                            onClick={incrementTerm}
                            disabled={Number(term) >= maxTerm}
                        >
                            +
                        </button>
                    </div>
                    <input
                        type="range"
                        value={term === '' ? 1 : term}
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
