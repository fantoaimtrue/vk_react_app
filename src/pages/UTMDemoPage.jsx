import React from 'react';
import UTMDemo from '../components/UTMDemo';

/**
 * Страница демонстрации UTM хука
 */
const UTMDemoPage = () => {
    return (
        <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                padding: '20px'
            }}>
                <UTMDemo />
            </div>
        </div>
    );
};

export default UTMDemoPage;
