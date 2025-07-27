import React, { useCallback, useEffect, useRef, useState } from 'react';
import Advantages from '../components/Advantages';
import LoanCalculator from '../components/LoanCalculator';
import LoanWizard from '../components/LoanWizard';
import MFOCard from '../components/MFOCard';
import SortControls from '../components/SortControls';
import Spinner from '../components/Spinner';
import { mapDjangoMfo } from '../utils/djangoUtils'; // Импортируем наш "переводчик"
import './MFOHome.css';

const INITIAL_ITEMS_TO_SHOW = 9;
const ITEMS_PER_LOAD = 9;

const MFOHome = () => {
    const [mfoList, setMfoList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [sortPriority, setSortPriority] = useState('rate');
    const [amount, setAmount] = useState(15000);
    const [term, setTerm] = useState(15);
    const [maxLoanAmount, setMaxLoanAmount] = useState(100000); // Default max amount
    const [maxLoanTerm, setMaxLoanTerm] = useState(365); // Default max term
    const mfoListRef = useRef(null); // Создаем ref для списка

    useEffect(() => {
        const fetchMFOs = async () => {
            try {
                const response = await fetch('/api/mfos/');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const apiData = await response.json();

                const rawData = Array.isArray(apiData) ? apiData : apiData.results;

                if (!Array.isArray(rawData)) {
                    throw new Error("Ожидался массив данных, но получен другой тип.");
                }

                const data = rawData.map(mapDjangoMfo);
                setMfoList(data);

                if (data.length > 0) {
                    // Защита от null/undefined значений
                    const maxAmount = Math.max(...data.map(mfo => Number(mfo.sum_max) || 0));
                    setMaxLoanAmount(maxAmount);
                    const maxTerm = Math.max(...data.map(mfo => Number(mfo.term_max) || 0));
                    setMaxLoanTerm(maxTerm);
                }

            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchMFOs();
    }, []);

    const observer = useRef();
    const loaderRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                setVisibleCount(prevCount => prevCount + ITEMS_PER_LOAD);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading]);


    const handleWizardComplete = (priority) => {
        setSortPriority(priority);
        setVisibleCount(INITIAL_ITEMS_TO_SHOW); // Сбрасываем количество видимых карточек
        setIsWizardOpen(false);
        // Плавный скролл к списку после закрытия модального окна
        setTimeout(() => {
            mfoListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100); // Небольшая задержка для плавности
    };

    const handleSortChange = (priority) => {
        setSortPriority(priority);
    }

    const getSortedMFOs = () => {
        const sortedMFOs = [...mfoList].sort((a, b) => {
            const aEligible = a.sum_min <= amount && a.sum_max >= amount && a.term_min <= term && a.term_max >= term;
            const bEligible = b.sum_min <= amount && b.sum_max >= amount && b.term_min <= term && b.term_max >= term;

            if (aEligible && !bEligible) return -1;
            if (!aEligible && bEligible) return 1;

            switch (sortPriority) {
                case 'rate':
                    const aOverpayment = amount * (a.rate_min / 100) * term;
                    const bOverpayment = amount * (b.rate_min / 100) * term;
                    return aOverpayment - bOverpayment;
                case 'speed':
                    return a.payout_speed_hours - b.payout_speed_hours;
                case 'approval':
                    return b.approval_chance - a.approval_chance;
                default:
                    return 0;
            }
        });
        return sortedMFOs;
    };

    const sortedMFOs = getSortedMFOs();

    const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS_TO_SHOW);


    if (error) {
        return <div className="error-message">Ошибка: {error}</div>;
    }

    return (
        <>
            <div className="toolbar">
                <button onClick={() => setIsWizardOpen(true)} className="wizard-button">
                    🧙‍♂️ Мастер подбора для новичков
                </button>
            </div>

            <div className="filter-panel">
                <h3 className="filter-panel-title">Подбор по параметрам</h3>
                <LoanCalculator
                    amount={amount}
                    term={term}
                    onAmountChange={setAmount}
                    onTermChange={setTerm}
                    maxAmount={maxLoanAmount}
                    maxTerm={maxLoanTerm}
                />
                <SortControls currentSort={sortPriority} onSortChange={handleSortChange} />
            </div>

            {isWizardOpen && (
                <LoanWizard
                    onComplete={handleWizardComplete}
                    onCancel={() => setIsWizardOpen(false)}
                />
            )}

            {loading ? (
                <Spinner />
            ) : (
                <>
                    <div className="mfo-list" ref={mfoListRef}>
                        {sortedMFOs.slice(0, visibleCount).map((mfo) => (
                            <MFOCard
                                key={mfo.id}
                                mfo={mfo}
                                requestedAmount={amount}
                                requestedTerm={term}
                            />
                        ))}
                    </div>

                    <div ref={loaderRef} style={{ height: '100px', margin: '30px 0' }}>
                        {visibleCount < sortedMFOs.length && <Spinner />}
                    </div>
                </>
            )}

            <Advantages />
            <div className="app-version">Версия 2.0.0 (Django)</div>

            <div className="partners-info">
                <h3>Мы работаем с лучшими финансовыми сервисами в РФ</h3>
            </div>
        </>
    );
};

export default MFOHome; 