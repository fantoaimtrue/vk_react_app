import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Breadcrumbs.css';

const Breadcrumbs = ({ mfoName }) => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);

    if (location.pathname === '/') {
        return null;
    }

    return (
        <nav aria-label="breadcrumb" className="breadcrumbs-nav">
            <Link to="/">Главная</Link>
            {pathnames.length > 0 && <span className="separator"> / </span>}
            {pathnames.map((name, index) => {
                const isLast = index === pathnames.length - 1;
                if (name === 'mfo') return null; // Скрываем сегмент "mfo"

                const breadcrumb = isLast && mfoName ? mfoName : name;

                return isLast ? (
                    <span key={name}>{breadcrumb}</span>
                ) : (
                    // В текущей структуре здесь ничего не будет, но оставлено для гибкости
                    <span key={name}>
                        <Link to={`/${name}`}>{breadcrumb}</Link>
                        {pathnames.length > index + 2 && <span className="separator"> / </span>}
                    </span>
                );
            })}
        </nav>
    );
};

export default Breadcrumbs; 