import { useCallback, useEffect, useState } from 'react';
import { createMFODynamicLink, getRefParams, getUserData } from '../utils/vkUtils';

/**
 * Хук для работы с динамическими ссылками MFO
 */
export const useDynamicLinks = () => {
  const [userData, setUserData] = useState(null);
  const [refParams, setRefParams] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Инициализация данных пользователя и ref параметров
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [userDataResult, refParamsResult] = await Promise.all([
          getUserData(),
          getRefParams()
        ]);

        setUserData(userDataResult);
        setRefParams(refParamsResult);
      } catch (err) {
        console.error('Ошибка инициализации данных для динамических ссылок:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  // Функция для создания динамической ссылки для конкретного MFO
  const createDynamicLink = useCallback(async (mfo) => {
    if (!mfo) return '';
    
    try {
      return await createMFODynamicLink(mfo);
    } catch (err) {
      console.error('Ошибка создания динамической ссылки:', err);
      return mfo.link || '';
    }
  }, []);

  // Функция для пакетного создания динамических ссылок для массива MFO
  const createMultipleDynamicLinks = useCallback(async (mfos) => {
    if (!Array.isArray(mfos)) return {};

    try {
      const linkPromises = mfos.map(async (mfo) => {
        const dynamicLink = await createDynamicLink(mfo);
        return { id: mfo.id, link: dynamicLink };
      });

      const results = await Promise.all(linkPromises);
      
      // Преобразуем в объект для быстрого доступа по ID
      return results.reduce((acc, { id, link }) => {
        acc[id] = link;
        return acc;
      }, {});
    } catch (err) {
      console.error('Ошибка создания множественных динамических ссылок:', err);
      return {};
    }
  }, [createDynamicLink]);

  return {
    userData,
    refParams,
    isLoading,
    error,
    createDynamicLink,
    createMultipleDynamicLinks
  };
};

/**
 * Хук для получения одной динамической ссылки для конкретного MFO
 */
export const useMFODynamicLink = (mfo) => {
  const [dynamicLink, setDynamicLink] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const generateLink = async () => {
      if (!mfo) {
        setDynamicLink('');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const link = await createMFODynamicLink(mfo);
        setDynamicLink(link);
      } catch (err) {
        console.error('Ошибка генерации динамической ссылки:', err);
        setError(err);
        setDynamicLink(mfo.link || '');
      } finally {
        setIsLoading(false);
      }
    };

    generateLink();
  }, [mfo]);

  return {
    dynamicLink,
    isLoading,
    error
  };
};
