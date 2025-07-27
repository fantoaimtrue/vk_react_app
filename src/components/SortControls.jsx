import React from 'react';
import './SortControls.css';

const sortOptions = [
    { key: 'rate', label: 'По переплате' },
    { key: 'speed', label: 'По скорости' },
    { key: 'approval', label: 'По одобрению' }
];

const SortControls = ({ currentSort, onSortChange }) => {
    return (
        <div className="sort-controls">
            <span className="sort-label">Сортировать:</span>
            <div className="sort-buttons">
                {sortOptions.map(option => (
                    <button
                        key={option.key}
                        className={`sort-button ${currentSort === option.key ? 'active' : ''}`}
                        onClick={() => onSortChange(option.key)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SortControls; 