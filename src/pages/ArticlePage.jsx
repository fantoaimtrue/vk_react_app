import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ArticleNavigation from '../components/ArticleNavigation';
import Spinner from '../components/Spinner';
import './ArticlePage.css';

const ArticlePage = () => {
    const { articleId } = useParams();
    const [article, setArticle] = useState(null);
    const [prevArticle, setPrevArticle] = useState(null);
    const [nextArticle, setNextArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchArticleData = async () => {
            setLoading(true);
            try {
                // Возвращаем логику загрузки статей из локального файла
                const response = await fetch('/data/articles.json');
                if (!response.ok) {
                    throw new Error('Не удалось загрузить данные статей');
                }
                const articles = await response.json();
                const currentIndex = articles.findIndex(a => a.id === articleId);

                if (currentIndex === -1) {
                    throw new Error('Статья не найдена');
                }

                setArticle(articles[currentIndex]);
                setPrevArticle(currentIndex > 0 ? articles[currentIndex - 1] : null);
                setNextArticle(currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null);

            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        fetchArticleData();
    }, [articleId]);

    if (loading) return <Spinner />;
    if (error) return <div className="error-message">Ошибка: {error}</div>;
    if (!article) return <div>Статья не найдена.</div>;

    return (
        <div className="article-page-container">
            <Link to="/kb" className="back-to-kb">← Назад к статьям</Link>
            <h1 className="article-page-title">{article.title}</h1>
            <div className="article-content" dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br />') }} />
            <ArticleNavigation prevArticle={prevArticle} nextArticle={nextArticle} />
        </div>
    );
};

export default ArticlePage; 