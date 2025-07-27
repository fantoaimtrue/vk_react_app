import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import Spinner from '../components/Spinner';
import { mapDjangoMfo } from '../utils/djangoUtils'; // Импортируем "переводчик"
import MFODetail from './MFODetail';

const MFODetailWrapper = () => {
    const { id } = useParams();
    const [mfo, setMfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMFO = async () => {
            try {
                setLoading(true);
                // Заменяем абсолютный URL на относительный
                const response = await fetch(`/api/mfos/${id}/`);
                if (!response.ok) {
                    throw new Error('Не удалось загрузить данные МФО');
                }
                const apiData = await response.json();

                if (apiData) {
                    // Преобразуем данные с помощью "переводчика"
                    const currentMfo = mapDjangoMfo(apiData);
                    setMfo(currentMfo);
                } else {
                    throw new Error('МФО не найдена');
                }
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMFO();
    }, [id]);

    if (loading) return <Spinner />;
    if (error) return <div className="error-message">Ошибка: {error}</div>;

    return (
        <>
            <Breadcrumbs mfoName={mfo?.name} />
            <MFODetail mfo={mfo} />
        </>
    );
};

export default MFODetailWrapper; 