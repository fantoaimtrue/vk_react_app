import { useCallback, useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import './StatisticsPage.css';

const StatisticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(7);
  const [utmSource, setUtmSource] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        days: days.toString(),
      });
      
      if (utmSource) {
        params.append('utm_source', utmSource);
      }
      
      if (utmCampaign) {
        params.append('utm_campaign', utmCampaign);
      }
      
      const response = await fetch(`/api/utm-stats/?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Ошибка загрузки статистики: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
      console.error('Ошибка загрузки статистики:', err);
    } finally {
      setLoading(false);
    }
  }, [days, utmCampaign, utmSource]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatNumber = (num) => {
    return num?.toLocaleString('ru-RU') || 0;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="statistics-page">
      <div className="statistics-container">
        <h1 className="statistics-title">📊 Динамическая статистика</h1>
        
        {/* Фильтры */}
        <div className="statistics-filters">
          <div className="filter-group">
            <label htmlFor="days">Период (дней):</label>
            <select
              id="days"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="filter-select"
            >
              <option value={1}>1 день</option>
              <option value={7}>7 дней</option>
              <option value={30}>30 дней</option>
              <option value={90}>90 дней</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="utm_source">UTM Source:</label>
            <input
              id="utm_source"
              type="text"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              placeholder="Фильтр по источнику"
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="utm_campaign">UTM Campaign:</label>
            <input
              id="utm_campaign"
              type="text"
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              placeholder="Фильтр по кампании"
              className="filter-input"
            />
          </div>
          
          <button
            onClick={() => {
              setUtmSource('');
              setUtmCampaign('');
            }}
            className="filter-clear-btn"
          >
            Сбросить фильтры
          </button>
        </div>

        {/* Загрузка */}
        {loading && (
          <LoadingSpinner size="large" text="Загрузка статистики..." />
        )}

        {/* Ошибка */}
        {error && (
          <div className="statistics-error">
            <p>❌ {error}</p>
            <button onClick={fetchStats} className="retry-btn">
              Попробовать снова
            </button>
          </div>
        )}

        {/* Статистика */}
        {!loading && !error && stats && (
          <>
            {/* Общая статистика */}
            <div className="stats-overview">
              <div className="stat-card">
                <div className="stat-card-icon">📈</div>
                <div className="stat-card-content">
                  <div className="stat-card-label">Всего событий</div>
                  <div className="stat-card-value">{formatNumber(stats.total_events)}</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-card-icon">👥</div>
                <div className="stat-card-content">
                  <div className="stat-card-label">Уникальных пользователей</div>
                  <div className="stat-card-value">{formatNumber(stats.unique_users)}</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-card-icon">📅</div>
                <div className="stat-card-content">
                  <div className="stat-card-label">Период</div>
                  <div className="stat-card-value">{stats.period_days} дней</div>
                </div>
              </div>
            </div>

            {/* Статистика по источникам */}
            {stats.sources_stats && Object.keys(stats.sources_stats).length > 0 && (
              <div className="stats-section">
                <h2 className="stats-section-title">📊 Статистика по источникам (UTM Source)</h2>
                <div className="stats-table-container">
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th>Источник</th>
                        <th>Количество</th>
                        <th>Процент</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.sources_stats)
                        .sort(([, a], [, b]) => b - a)
                        .map(([source, count]) => (
                          <tr key={source}>
                            <td>{source || '(не указан)'}</td>
                            <td>{formatNumber(count)}</td>
                            <td>
                              {((count / stats.total_events) * 100).toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Статистика по кампаниям */}
            {stats.campaigns_stats && Object.keys(stats.campaigns_stats).length > 0 && (
              <div className="stats-section">
                <h2 className="stats-section-title">🎯 Статистика по кампаниям (UTM Campaign)</h2>
                <div className="stats-table-container">
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th>Кампания</th>
                        <th>Количество</th>
                        <th>Процент</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.campaigns_stats)
                        .sort(([, a], [, b]) => b - a)
                        .map(([campaign, count]) => (
                          <tr key={campaign}>
                            <td>{campaign || '(не указана)'}</td>
                            <td>{formatNumber(count)}</td>
                            <td>
                              {((count / stats.total_events) * 100).toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Статистика по платформам */}
            {stats.platforms_stats && Object.keys(stats.platforms_stats).length > 0 && (
              <div className="stats-section">
                <h2 className="stats-section-title">📱 Статистика по платформам (VK Platform)</h2>
                <div className="stats-table-container">
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th>Платформа</th>
                        <th>Количество</th>
                        <th>Процент</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.platforms_stats)
                        .sort(([, a], [, b]) => b - a)
                        .map(([platform, count]) => (
                          <tr key={platform}>
                            <td>{platform || '(не указана)'}</td>
                            <td>{formatNumber(count)}</td>
                            <td>
                              {((count / stats.total_events) * 100).toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Последние события */}
            {stats.recent_events && stats.recent_events.length > 0 && (
              <div className="stats-section">
                <h2 className="stats-section-title">🕐 Последние события</h2>
                <div className="stats-table-container">
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th>Время</th>
                        <th>User ID</th>
                        <th>UTM Source</th>
                        <th>UTM Campaign</th>
                        <th>VK Ad ID</th>
                        <th>Тип события</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recent_events.map((event) => (
                        <tr key={event.id}>
                          <td>{formatDate(event.timestamp)}</td>
                          <td>{event.user_id || '-'}</td>
                          <td>{event.utm_source || '-'}</td>
                          <td>{event.utm_campaign || '-'}</td>
                          <td>{event.vk_ad_id || '-'}</td>
                          <td>{event.event_type || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Кнопка обновления */}
            <div className="stats-refresh">
              <button onClick={fetchStats} className="refresh-btn">
                🔄 Обновить статистику
              </button>
              <p className="refresh-hint">
                Статистика обновляется автоматически при изменении фильтров
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StatisticsPage;

