import React from 'react';
import { Link } from 'react-router-dom';
import './ArticleNavigation.css';

const ArticleNavigation = ({ prevArticle, nextArticle }) => {
    return (
        <div className="article-navigation">
            <div className="nav-link-container">
                {prevArticle && (
                    <Link to={`/kb/${prevArticle.id}`} className="nav-link prev">
                        <span className="arrow">←</span>
                        <span className="text-content">
                            <span className="label">Предыдущая статья</span>
                            <span className="title">{prevArticle.title}</span>
                        </span>
                    </Link>
                )}
            </div>
            <div className="nav-link-container">
                {nextArticle && (
                    <Link to={`/kb/${nextArticle.id}`} className="nav-link next">
                        <span className="text-content">
                            <span className="label">Следующая статья</span>
                            <span className="title">{nextArticle.title}</span>
                        </span>
                        <span className="arrow">→</span>
                    </Link>
                )}
            </div>
        </div>
    );
};

export default ArticleNavigation; 