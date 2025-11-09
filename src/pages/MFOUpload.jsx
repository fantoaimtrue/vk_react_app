import React from 'react';

const MFOUpload = () => {
    return (
        <div style={{
            padding: '20px',
            textAlign: 'center',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-primary)',
            borderRadius: '16px',
            maxWidth: '800px',
            margin: '0 auto'
        }}>
            <h1 style={{ color: 'var(--text-primary)' }}>Загрузка МФО</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Страница загрузки МФО работает!</p>
        </div>
    );
};

export default MFOUpload;