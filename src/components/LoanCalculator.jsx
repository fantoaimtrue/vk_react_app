import React from 'react';
import './LoanCalculator.css';

const LoanCalculator = ({ amount, term, onAmountChange, onTermChange, maxAmount = 100000, maxTerm = 90 }) => {
    // Константы для нелинейного скролла
    const AMOUNT_BREAKPOINT = 30000; // До 30к - основная часть
    const AMOUNT_BREAKPOINT_RATIO = 0.7; // 70% слайдера для первых 30к
    const MIN_AMOUNT = 1000;
    
    const TERM_BREAKPOINT = 30; // До 30 дней - основная часть
    const TERM_BREAKPOINT_RATIO = 0.7; // 70% слайдера для первых 30 дней
    const MIN_TERM = 1;

    // Преобразование значения слайдера в реальную сумму (нелинейное)
    const sliderToAmount = (sliderValue) => {
        const ratio = sliderValue / 100;
        
        if (ratio <= AMOUNT_BREAKPOINT_RATIO) {
            // 0-70% слайдера = 1000-30000
            const normalizedRatio = ratio / AMOUNT_BREAKPOINT_RATIO;
            return Math.round(MIN_AMOUNT + (AMOUNT_BREAKPOINT - MIN_AMOUNT) * normalizedRatio);
        } else {
            // 70-100% слайдера = 30000-100000
            const normalizedRatio = (ratio - AMOUNT_BREAKPOINT_RATIO) / (1 - AMOUNT_BREAKPOINT_RATIO);
            return Math.round(AMOUNT_BREAKPOINT + (maxAmount - AMOUNT_BREAKPOINT) * normalizedRatio);
        }
    };

    // Преобразование реальной суммы в значение слайдера (обратное)
    const amountToSlider = (amountValue) => {
        const amt = Math.max(MIN_AMOUNT, Math.min(maxAmount, amountValue));
        
        if (amt <= AMOUNT_BREAKPOINT) {
            // 1000-30000 = 0-70% слайдера
            const normalizedRatio = (amt - MIN_AMOUNT) / (AMOUNT_BREAKPOINT - MIN_AMOUNT);
            return Math.round(normalizedRatio * AMOUNT_BREAKPOINT_RATIO * 100);
        } else {
            // 30000-100000 = 70-100% слайдера
            const normalizedRatio = (amt - AMOUNT_BREAKPOINT) / (maxAmount - AMOUNT_BREAKPOINT);
            return Math.round((AMOUNT_BREAKPOINT_RATIO + normalizedRatio * (1 - AMOUNT_BREAKPOINT_RATIO)) * 100);
        }
    };

    // Преобразование значения слайдера в реальный срок (нелинейное)
    const sliderToTerm = (sliderValue) => {
        const ratio = sliderValue / 100;
        
        if (ratio <= TERM_BREAKPOINT_RATIO) {
            // 0-70% слайдера = 1-30 дней
            const normalizedRatio = ratio / TERM_BREAKPOINT_RATIO;
            return Math.round(MIN_TERM + (TERM_BREAKPOINT - MIN_TERM) * normalizedRatio);
        } else {
            // 70-100% слайдера = 30-90 дней
            const normalizedRatio = (ratio - TERM_BREAKPOINT_RATIO) / (1 - TERM_BREAKPOINT_RATIO);
            return Math.round(TERM_BREAKPOINT + (maxTerm - TERM_BREAKPOINT) * normalizedRatio);
        }
    };

    // Преобразование реального срока в значение слайдера (обратное)
    const termToSlider = (termValue) => {
        const t = Math.max(MIN_TERM, Math.min(maxTerm, termValue));
        
        if (t <= TERM_BREAKPOINT) {
            // 1-30 дней = 0-70% слайдера
            const normalizedRatio = (t - MIN_TERM) / (TERM_BREAKPOINT - MIN_TERM);
            return Math.round(normalizedRatio * TERM_BREAKPOINT_RATIO * 100);
        } else {
            // 30-90 дней = 70-100% слайдера
            const normalizedRatio = (t - TERM_BREAKPOINT) / (maxTerm - TERM_BREAKPOINT);
            return Math.round((TERM_BREAKPOINT_RATIO + normalizedRatio * (1 - TERM_BREAKPOINT_RATIO)) * 100);
        }
    };

    const handleAmountChange = (e) => {
        const value = e.target.value;
        if (value === '' || value === null) {
            onAmountChange('');
            return;
        }
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            onAmountChange(Math.max(MIN_AMOUNT, Math.min(maxAmount, numValue)));
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
            onTermChange(Math.max(MIN_TERM, Math.min(maxTerm, numValue)));
        }
    };

    // Обработчик изменения слайдера суммы
    const handleAmountSliderChange = (e) => {
        const sliderValue = Number(e.target.value);
        const newAmount = sliderToAmount(sliderValue);
        onAmountChange(newAmount);
    };

    // Обработчик изменения слайдера срока
    const handleTermSliderChange = (e) => {
        const sliderValue = Number(e.target.value);
        const newTerm = sliderToTerm(sliderValue);
        onTermChange(newTerm);
    };

    // Быстрый выбор суммы
    const quickAmounts = [10000, 20000, 30000];
    const handleQuickAmount = (quickAmount) => {
        onAmountChange(Math.min(quickAmount, maxAmount));
    };

    // Быстрый выбор срока
    const quickTerms = [7, 14, 30];
    const handleQuickTerm = (quickTerm) => {
        onTermChange(Math.min(quickTerm, maxTerm));
    };

    const incrementAmount = () => {
        const currentAmount = Number(amount) || MIN_AMOUNT;
        let step = 1000;
        
        // Увеличиваем шаг для больших сумм
        if (currentAmount >= AMOUNT_BREAKPOINT) {
            step = 5000;
        }
        
        const newAmount = Math.min(maxAmount, currentAmount + step);
        onAmountChange(newAmount);
    };

    const decrementAmount = () => {
        const currentAmount = Number(amount) || MIN_AMOUNT;
        let step = 1000;
        
        // Увеличиваем шаг для больших сумм
        if (currentAmount > AMOUNT_BREAKPOINT) {
            step = 5000;
        }
        
        const newAmount = Math.max(MIN_AMOUNT, currentAmount - step);
        onAmountChange(newAmount);
    };

    const incrementTerm = () => {
        const currentTerm = Number(term) || MIN_TERM;
        let step = 1;
        
        // Увеличиваем шаг для больших сроков
        if (currentTerm >= TERM_BREAKPOINT) {
            step = 5;
        }
        
        const newTerm = Math.min(maxTerm, currentTerm + step);
        onTermChange(newTerm);
    };

    const decrementTerm = () => {
        const currentTerm = Number(term) || MIN_TERM;
        let step = 1;
        
        // Увеличиваем шаг для больших сроков
        if (currentTerm > TERM_BREAKPOINT) {
            step = 5;
        }
        
        const newTerm = Math.max(MIN_TERM, currentTerm - step);
        onTermChange(newTerm);
    };

    // Получаем значение слайдера для текущей суммы
    const getAmountSliderValue = () => {
        const amt = Number(amount) || MIN_AMOUNT;
        return amountToSlider(amt);
    };

    // Получаем значение слайдера для текущего срока
    const getTermSliderValue = () => {
        const t = Number(term) || MIN_TERM;
        return termToSlider(t);
    };

    return (
        <div className="loan-calculator">
            <div className="calculator-inputs">
                <div className="input-group">
                    <label htmlFor="amount">СУММА (₽)</label>
                    {/* Быстрые кнопки выбора суммы */}
                    <div className="quick-buttons-group">
                        {quickAmounts.map((quickAmount) => (
                            <button
                                key={quickAmount}
                                type="button"
                                className={`quick-button ${Number(amount) === quickAmount ? 'quick-button-active' : ''}`}
                                onClick={() => handleQuickAmount(quickAmount)}
                            >
                                {quickAmount.toLocaleString()} ₽
                            </button>
                        ))}
                    </div>
                    <div className="input-with-buttons">
                        <button
                            type="button"
                            className="calc-button calc-minus"
                            onClick={decrementAmount}
                            disabled={Number(amount) <= MIN_AMOUNT}
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
                                if (amount === '' || amount < MIN_AMOUNT) {
                                    onAmountChange(MIN_AMOUNT);
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
                        value={getAmountSliderValue()}
                        onChange={handleAmountSliderChange}
                        min="0"
                        max="100"
                        step="1"
                    />
                </div>
                <div className="input-group">
                    <label htmlFor="term">СРОК (ДНЕЙ)</label>
                    {/* Быстрые кнопки выбора срока */}
                    <div className="quick-buttons-group">
                        {quickTerms.map((quickTerm) => (
                            <button
                                key={quickTerm}
                                type="button"
                                className={`quick-button ${Number(term) === quickTerm ? 'quick-button-active' : ''}`}
                                onClick={() => handleQuickTerm(quickTerm)}
                            >
                                {quickTerm} дней
                            </button>
                        ))}
                    </div>
                    <div className="input-with-buttons">
                        <button
                            type="button"
                            className="calc-button calc-minus"
                            onClick={decrementTerm}
                            disabled={Number(term) <= MIN_TERM}
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
                                if (term === '' || term < MIN_TERM) {
                                    onTermChange(MIN_TERM);
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
                        value={getTermSliderValue()}
                        onChange={handleTermSliderChange}
                        min="0"
                        max="100"
                        step="1"
                    />
                </div>
            </div>
        </div>
    );
};

export default LoanCalculator;
