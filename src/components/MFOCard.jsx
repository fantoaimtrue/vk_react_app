import React from 'react';
import { Link } from 'react-router-dom';
import { useMFODynamicLink } from '../hooks/useDynamicLinks';
import { useTracking } from '../contexts/TrackingContext';
import './MFOCard.css';

const MFOCard = ({ mfo, requestedAmount, requestedTerm }) => {
  // Получаем динамическую ссылку для данного MFO
  const { dynamicLink, isLoading: linkLoading } = useMFODynamicLink(mfo);
  // Получаем tracking данные для добавления sub4/sub5
  const { buildUrl } = useTracking();

  const isEligible =
    requestedAmount >= mfo.sum_min &&
    requestedAmount <= mfo.sum_max &&
    requestedTerm >= mfo.term_min &&
    requestedTerm <= mfo.term_max;

  const calculateOverpayment = () => {
    // Проверяем, что ставка является числом, иначе используем 0
    const dailyRate = typeof mfo.rate === 'number' ? mfo.rate / 100 : 0;
    const overpayment = requestedAmount * dailyRate * requestedTerm;
    return Math.round(overpayment);
  };

  const totalAmount = requestedAmount + calculateOverpayment();

  return (
    <div className={`mfo-card ${isEligible ? '' : 'ineligible'}`}>
      <div className="mfo-card-header">
        <div className="mfo-logo">
          {mfo.logo_url ? (
            <img src={mfo.logo_url} alt={`${mfo.name} logo`} className="mfo-logo-img" />
          ) : (
            <span role="img" aria-label="logo icon">🏦</span>
          )}
        </div>
        <h3 className="mfo-name">{mfo.name}</h3>
      </div>
      <div className="mfo-card-body">
        <div className="mfo-params-static">
          <p>Сумма: от {mfo.sum_min} до {mfo.sum_max} ₽</p>
          <p>Срок: от {mfo.term_min} до {mfo.term_max} дней</p>
          <p>Ставка: от {mfo.rate} в день</p>
        </div>
        {isEligible && (
          <div className="mfo-calculation">
            <p>Переплата: <strong>{calculateOverpayment()} ₽</strong></p>
            <p>К возврату: <strong>{totalAmount} ₽</strong></p>
          </div>
        )}
      </div>
      <div className="mfo-card-footer">
        {isEligible && (
          <a
            href={buildUrl(dynamicLink || mfo.link)}
            target="_blank"
            rel="noopener noreferrer"
            className="details-link"
            style={{ opacity: linkLoading ? 0.7 : 1 }}
          >
            {linkLoading ? 'Загрузка...' : 'Оформить'}
          </a>
        )}
        <Link
          to={`/mfo/${mfo.id}`}
          className={isEligible ? 'more-info-link' : 'details-link'}
        >
          Подробнее
        </Link>
      </div>
    </div>
  );
};

export default MFOCard; 