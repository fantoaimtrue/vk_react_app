import React from 'react';
import useUTMTracker from '../hooks/useUTMTracker';

/**
 * Демонстрационный компонент для показа работы UTM хука
 */
const UTMDemo = () => {
    const {
        utmParams,
        userData,
        isLoading,
        error,
        generateLinkWithUTM,
        getUTMParam,
        hasUTMParams
    } = useUTMTracker();

    if (isLoading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <div>🔄 Загрузка UTM параметров...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '20px', color: 'red' }}>
                <div>❌ Ошибка: {error}</div>
            </div>
        );
    }

    // Тестовые ссылки МФО
    const testLinks = [
        {
            name: 'BelkaCredit',
            url: 'https://безотказа.бабкиманки.рф/8mhTo?s4={ad_id}&s5={ref_source}&s6={user_id}'
        },
        {
            name: 'MoneyMan',
            url: 'https://безотказа.бабкиманки.рф/LP6Ow?s4={ad_id}&s5={ref_source}&s6={user_id}'
        },
        {
            name: 'Boostra',
            url: 'https://безотказа.бабкиманки.рф/I0Txx?s4={ad_id}&s5={ref_source}&s6={user_id}'
        }
    ];

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2>🎯 UTM Tracker Demo</h2>

            {/* Информация о пользователе */}
            <div style={{
                background: '#f0f8ff',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h3>👤 Данные пользователя</h3>
                <div><strong>ID:</strong> {userData.id || 'Не определен'}</div>
                <div><strong>Имя:</strong> {userData.first_name || 'Не определено'}</div>
                <div><strong>Фамилия:</strong> {userData.last_name || 'Не определена'}</div>
            </div>

            {/* UTM параметры */}
            <div style={{
                background: '#f0fff0',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h3>📊 UTM параметры</h3>
                {hasUTMParams() ? (
                    <div>
                        {Object.entries(utmParams).map(([key, value]) => (
                            <div key={key} style={{ marginBottom: '5px' }}>
                                <strong>{key}:</strong> {value || 'пусто'}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>⚠️ UTM параметры не найдены</div>
                )}
            </div>

            {/* Тестовые ссылки */}
            <div style={{
                background: '#fff5f5',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h3>🔗 Сгенерированные ссылки</h3>
                {testLinks.map((link, index) => {
                    const generatedUrl = generateLinkWithUTM(link.url, {
                        ad_id: getUTMParam('vk_ad_id') || getUTMParam('ad_id') || 'test_ad_12345',
                        ref_source: getUTMParam('vk_ref_source') || getUTMParam('ref_source') || 'vk_mini_app',
                        user_id: userData.id || getUTMParam('vk_user_id') || getUTMParam('user_id') || '12345'
                    });

                    return (
                        <div key={index} style={{ marginBottom: '15px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                {link.name}:
                            </div>
                            <div style={{
                                background: '#f8f9fa',
                                padding: '10px',
                                borderRadius: '4px',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                wordBreak: 'break-all',
                                border: '1px solid #dee2e6'
                            }}>
                                {generatedUrl}
                            </div>
                            <button
                                onClick={() => window.open(generatedUrl, '_blank')}
                                style={{
                                    marginTop: '5px',
                                    padding: '5px 10px',
                                    background: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Открыть ссылку
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Инструкции */}
            <div style={{
                background: '#fff3cd',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #ffeaa7'
            }}>
                <h3>📝 Инструкции для тестирования</h3>
                <div style={{ fontSize: '14px' }}>
                    <p><strong>Для тестирования добавьте параметры в URL:</strong></p>
                    <div style={{
                        background: '#f8f9fa',
                        padding: '10px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        margin: '10px 0'
                    }}>
                        ?ad_id=12345&ref_source=vk_mini_app&user_id=67890&utm_source=vk&utm_campaign=test_campaign
                    </div>
                    <p><strong>Пример полного URL:</strong></p>
                    <div style={{
                        background: '#f8f9fa',
                        padding: '10px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        wordBreak: 'break-all'
                    }}>
                        https://bodyexp.ru/?ad_id=12345&ref_source=vk_mini_app&user_id=67890&utm_source=vk&utm_campaign=test_campaign
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UTMDemo;
