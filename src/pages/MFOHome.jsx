import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Advantages from '../components/Advantages';
import LoanCalculator from '../components/LoanCalculator';
import LoanWizard from '../components/LoanWizard';
import MFOCard from '../components/MFOCard';
import { mapDjangoMfo } from '../utils/djangoUtils'; // Импортируем наш "переводчик"
import './MFOHome.css';

const INITIAL_ITEMS_TO_SHOW = 9;
const ITEMS_PER_LOAD = 9;

const MFOHome = () => {
    const [mfoList, setMfoList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [amount, setAmount] = useState(15000);
    const [term, setTerm] = useState(15);
    const [maxLoanAmount, setMaxLoanAmount] = useState(100000); // Default max amount
    const [maxLoanTerm, setMaxLoanTerm] = useState(90); // Default max term (3 months)
    const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS_TO_SHOW);
    const [sortPriority, setSortPriority] = useState('overpayment'); // 'overpayment', 'speed', 'approval'
    const mfoListRef = useRef(null); // Создаем ref для списка

    useEffect(() => {
        const fetchMFOs = async () => {
            try {
                console.log('Fetching MFOs...');
                const response = await fetch('/api/mfos/');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const apiData = await response.json();
                console.log('API response:', apiData);

                const rawData = Array.isArray(apiData) ? apiData : apiData.results;

                if (!Array.isArray(rawData)) {
                    console.error('Invalid data format:', apiData);
                    throw new Error("Ожидался массив данных, но получен другой тип.");
                }

                console.log('Raw data length:', rawData.length);
                const data = rawData.map((mfo, index) => {
                    try {
                        return mapDjangoMfo(mfo);
                    } catch (mappingError) {
                        console.error(`Error mapping MFO at index ${index}:`, mappingError, mfo);
                        return null;
                    }
                }).filter(Boolean); // Убираем null значения

                console.log('Processed data length:', data.length);
                console.log('First MFO:', data[0]);
                setMfoList(data);

                if (data.length > 0) {
                    // Защита от null/undefined значений
                    const maxAmount = Math.max(...data.map(mfo => Number(mfo.sum_max) || 0));
                    const maxTerm = Math.max(...data.map(mfo => Number(mfo.term_max) || 0));

                    // Устанавливаем наши максимальные значения, но не меньше чем в API
                    setMaxLoanAmount(Math.max(maxAmount, 100000));
                    setMaxLoanTerm(Math.max(maxTerm, 90));
                    console.log('API max amount:', maxAmount, 'API max term:', maxTerm);
                    console.log('Set max amount: 100000, max term: 90');
                }

            } catch (e) {
                console.error('Error fetching MFOs:', e);
                setError(e.message);
            } finally {
                console.log('Setting loading to false');
                setLoading(false);
            }
        };
        fetchMFOs();
    }, []);

    // Отладочный useEffect для отслеживания изменений loading
    useEffect(() => {
        console.log('Loading state changed to:', loading);
    }, [loading]);

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
        setSortPriority(priority); // Устанавливаем приоритет сортировки
        setVisibleCount(INITIAL_ITEMS_TO_SHOW); // Сбрасываем количество видимых карточек
        setIsWizardOpen(false);
        // Плавный скролл к списку после закрытия модального окна
        setTimeout(() => {
            mfoListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100); // Небольшая задержка для плавности
    };


    const getSortedMFOs = () => {
        const sortedMFOs = [...mfoList].sort((a, b) => {
            const aEligible = a.sum_min <= amount && a.sum_max >= amount && a.term_min <= term && a.term_max >= term;
            const bEligible = b.sum_min <= amount && b.sum_max >= amount && b.term_min <= term && b.term_max >= term;

            if (aEligible && !bEligible) return -1;
            if (!aEligible && bEligible) return 1;

            // Сортировка в зависимости от выбранного приоритета
            switch (sortPriority) {
                case 'speed':
                    // Сортировка по скорости выплаты (меньше = быстрее)
                    return (a.payout_speed_hours || 0) - (b.payout_speed_hours || 0);

                case 'approval':
                    // Сортировка по шансу одобрения (больше = лучше)
                    return (b.approval_chance || 0) - (a.approval_chance || 0);

                case 'overpayment':
                default:
                    // Сортировка по переплате (меньше = лучше)
                    const aOverpayment = amount * (a.rate || 0) / 100 * term;
                    const bOverpayment = amount * (b.rate || 0) / 100 * term;
                    return aOverpayment - bOverpayment;
            }
        });
        return sortedMFOs;
    };

    const sortedMFOs = getSortedMFOs();
    console.log('sortedMFOs in render:', sortedMFOs.length, 'visibleCount:', visibleCount);


    if (error) {
        return <div className="error-message">Ошибка: {error}</div>;
    }

    return (
        <>
            <div className="toolbar">
                <button onClick={() => setIsWizardOpen(true)} className="wizard-button">
                    Мастер подбора для новичков
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
                <button className="offer-button" onClick={() => {
                    // Плавный скролл к списку МФО
                    mfoListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}>
                    Получить предложение
                </button>
            </div>

            {isWizardOpen && (
                <LoanWizard
                    onComplete={handleWizardComplete}
                    onCancel={() => setIsWizardOpen(false)}
                />
            )}

            {loading ? (
                <div style={{ padding: '50px', textAlign: 'center', backgroundColor: '#f0f0f0', margin: '20px' }}>
                    <h2>Загрузка МФО...</h2>
                    <p>Loading state: {loading.toString()}</p>
                    {console.log('Rendering loading block - loading is:', loading)}
                </div>
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
                        {visibleCount < sortedMFOs.length && (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <p>Загружаем еще МФО... ({visibleCount} из {sortedMFOs.length})</p>
                                {console.log('Lazy loading block - visibleCount:', visibleCount, 'sortedMFOs.length:', sortedMFOs.length)}
                            </div>
                        )}
                    </div>
                </>
            )}

            <Advantages />

            <div className="bot-promo-section">
                <h3>🤖 Получайте лучшие предложения в боте!</h3>
                <p>Подпишитесь на нашего бота ВК и получайте уведомления о новых займах под 0% и эксклюзивных предложениях.</p>
                <a
                    href="https://vk.me/babkimonkey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bot-promo-button"
                >
                    Подписаться на бота ВК
                </a>
            </div>

            <div className="knowledge-base-section">
                <h3>Нужна помощь с получением займа?</h3>
                <p>Если вам отказывают везде, изучите нашу базу знаний с полезными советами и рекомендациями.</p>
                <Link to="/kb" className="kb-link-button">
                    Перейти в базу знаний
                </Link>
            </div>

            <div className="partners-info">
                <h3>Мы работаем с лучшими финансовыми сервисами в РФ</h3>
            </div>
        </>
    );
};

export default MFOHome; 