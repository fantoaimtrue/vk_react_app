import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import './KnowledgeBase.css';

const KnowledgeBase = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                // Возвращаем загрузку статей из локального файла
                const response = await fetch('/data/articles.json');
                if (!response.ok) {
                    throw new Error('Не удалось загрузить статьи');
                }
                const data = await response.json();
                setArticles(data);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchArticles();
    }, []);

    if (loading) return <Spinner />;
    if (error) return <div className="error-message">Ошибка: {error}</div>;

    return (
        <div className="knowledge-base-container">
            <h1>База знаний</h1>
            <p className="page-description">Здесь мы собрали полезные статьи, которые помогут вам лучше разбираться в мире финансов и принимать взвешенные решения.</p>

            <div className="kb-nav">
                <Link to="/" className="back-to-loans-link">
                    ← Вернуться к подбору займа
                </Link>
            </div>

            <div className="articles-list">
                {articles.map(article => (
                    <Link to={`/kb/${article.id}`} key={article.id} className="article-card-link">
                        <div className="article-card">
                            <h2 className="article-title">{article.title}</h2>
                            <p className="article-description">{article.description}</p>
                            <span className="read-more">Читать далее →</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default KnowledgeBase; 