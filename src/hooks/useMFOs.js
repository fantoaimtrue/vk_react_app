import { useCallback, useEffect, useMemo, useState } from 'react';
import { mapDjangoMfo } from '../utils/djangoUtils';
import logger from '../utils/logger';

/**
 * Хук для управления данными МФО: загрузка, фильтрация, сортировка.
 * @param {object} options - Опции для фильтрации и сортировки.
 * @param {number} options.amount - Сумма займа.
 * @param {number} options.term - Срок займа.
 * @param {string} options.sortPriority - Приоритет сортировки ('rate', 'speed', 'approval').
 * @returns {object} - Состояние и данные МФО.
 */
export const useMFOs = ({ amount, term, sortPriority }) => {
    console.log('--- useMFOs HOOK START ---');
    const [mfoList, setMfoList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [maxLoanAmount, setMaxLoanAmount] = useState(100000);

    const fetchMfos = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Логируем всегда, даже в production (для отладки)
            console.log('📡 [useMFOs] Загрузка МФО...');
            console.log('📡 [useMFOs] URL:', window.location.href);
            logger.info('📡 [useMFOs] Загрузка МФО...');
            logger.info('📡 [useMFOs] URL:', window.location.href);
            
            const apiUrl = '/api/mfos/';
            console.log('📡 [useMFOs] Запрос к:', apiUrl);
            logger.info('📡 [useMFOs] Запрос к:', apiUrl);

            // Добавляем AbortController для таймаута
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Добавляем credentials для CORS
                credentials: 'same-origin',
                signal: controller.signal, // Передаем сигнал для отмены
            }).catch(fetchError => {
                logger.error('❌ [useMFOs] Ошибка fetch:', fetchError);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Тайм-аут загрузки данных');
                }
                throw new Error(`Ошибка сети: ${fetchError.message}`);
            });
            
            clearTimeout(timeoutId); // Очищаем таймаут после успешного fetch
            
            console.log('📡 [useMFOs] Статус ответа:', response.status, response.statusText);
            logger.info('📡 [useMFOs] Статус ответа:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Не удалось прочитать ошибку');
                console.error('❌ [useMFOs] HTTP ошибка:', response.status, errorText);
                logger.error('❌ [useMFOs] HTTP ошибка:', response.status, errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText.substring(0, 100)}`);
            }

            const data = await response.json().catch(jsonError => {
                console.error('❌ [useMFOs] Ошибка парсинга JSON:', jsonError);
                logger.error('❌ [useMFOs] Ошибка парсинга JSON:', jsonError);
                throw new Error(`Ошибка парсинга ответа: ${jsonError.message}`);
            });
            
            console.log('📦 [useMFOs] Получено МФО из API:', data.length);
            console.log('📦 [useMFOs] Тип данных:', Array.isArray(data) ? 'массив' : typeof data);
            logger.info('📦 [useMFOs] Получено МФО из API:', data.length);
            logger.info('📦 [useMFOs] Тип данных:', Array.isArray(data) ? 'массив' : typeof data);
            
            if (!Array.isArray(data)) {
                console.error('❌ [useMFOs] Данные не массив!', data);
                logger.error('❌ [useMFOs] Данные не массив!', data);
                throw new Error('API вернул не массив данных');
            }
            
            const mappedMfos = data.map(mapDjangoMfo);
            console.log('✅ [useMFOs] Обработано МФО:', mappedMfos.length);
            logger.info('✅ [useMFOs] Обработано МФО:', mappedMfos.length);
            
            if (mappedMfos.length > 0) {
                console.log('📋 [useMFOs] Первое МФО:', mappedMfos[0]);
                logger.info('📋 [useMFOs] Первое МФО:', mappedMfos[0]);
            } else {
                console.warn('⚠️ [useMFOs] Получен пустой массив МФО!');
                logger.warn('⚠️ [useMFOs] Получен пустой массив МФО!');
            }
            
            setMfoList(mappedMfos);

            if (mappedMfos.length > 0) {
                const maxAmount = Math.max(...mappedMfos.map(mfo => Number(mfo.sum_max) || 0));
                setMaxLoanAmount(Math.max(maxAmount, 100000));
                logger.info('💰 [useMFOs] Максимальная сумма займа:', maxAmount);
            } else {
                logger.warn('⚠️ [useMFOs] Нет МФО для установки максимальной суммы');
            }

        } catch (err) {
            console.error('❌ [useMFOs] Критическая ошибка загрузки МФО:', err);
            console.error('❌ [useMFOs] Stack trace:', err.stack);
            logger.error('❌ [useMFOs] Критическая ошибка загрузки МФО:', err);
            logger.error('❌ [useMFOs] Stack trace:', err.stack);
            setError(err.message || 'Неизвестная ошибка загрузки МФО');
        } finally {
            setLoading(false);
            console.log('🏁 [useMFOs] Загрузка завершена, loading=false');
            logger.info('🏁 [useMFOs] Загрузка завершена, loading=false');
        }
    }, []);

    useEffect(() => {
        fetchMfos();
    }, [fetchMfos]);

    const filteredAndSortedMfos = useMemo(() => {
        let filtered = [...mfoList];

        logger.info('🔍 [useMFOs] Фильтрация:', {
            total: mfoList.length,
            amount,
            term,
            sortPriority
        });

        // Фильтрация по сумме и сроку
        filtered = filtered.filter(mfo => {
            const passesAmount = mfo.sum_min <= amount && mfo.sum_max >= amount;
            const passesTerm = mfo.term_min <= term && mfo.term_max >= term;
            const passes = passesAmount && passesTerm;
            
            if (!passes) {
                logger.debug(`❌ [useMFOs] МФО "${mfo.name}" отфильтровано:`, {
                    sum_min: mfo.sum_min,
                    sum_max: mfo.sum_max,
                    term_min: mfo.term_min,
                    term_max: mfo.term_max,
                    passesAmount,
                    passesTerm
                });
            }
            
            return passes;
        });

        logger.info('✅ [useMFOs] После фильтрации:', filtered.length, 'МФО');

        // Многоуровневая сортировка
        filtered.sort((a, b) => {
            switch (sortPriority) {
                case 'rate':
                    const rateA = parseFloat(a.rate) || 999;
                    const rateB = parseFloat(b.rate) || 999;
                    if (rateA !== rateB) return rateA - rateB;
                    const approvalA_rate = parseFloat(a.approval_chance) || 0;
                    const approvalB_rate = parseFloat(b.approval_chance) || 0;
                    if (approvalA_rate !== approvalB_rate) return approvalB_rate - approvalA_rate;
                    const speedA_rate = parseFloat(a.payout_speed_hours) || 999;
                    const speedB_rate = parseFloat(b.payout_speed_hours) || 999;
                    return speedA_rate - speedB_rate;

                case 'speed':
                    const speedA = parseFloat(a.payout_speed_hours) || 999;
                    const speedB = parseFloat(b.payout_speed_hours) || 999;
                    if (speedA !== speedB) return speedA - speedB;
                    const approvalA_speed = parseFloat(a.approval_chance) || 0;
                    const approvalB_speed = parseFloat(b.approval_chance) || 0;
                    if (approvalA_speed !== approvalB_speed) return approvalB_speed - approvalA_speed;
                    const rateA_speed = parseFloat(a.rate) || 999;
                    const rateB_speed = parseFloat(b.rate) || 999;
                    return rateA_speed - rateB_speed;

                case 'approval':
                default:
                    const approvalA = parseFloat(a.approval_chance) || 0;
                    const approvalB = parseFloat(b.approval_chance) || 0;
                    if (approvalA !== approvalB) return approvalB - approvalA;
                    const rateA_approval = parseFloat(a.rate) || 999;
                    const rateB_approval = parseFloat(b.rate) || 999;
                    if (rateA_approval !== rateB_approval) return rateA_approval - rateB_approval;
                    const speedA_approval = parseFloat(a.payout_speed_hours) || 999;
                    const speedB_approval = parseFloat(b.payout_speed_hours) || 999;
                    return speedA_approval - speedB_approval;
            }
        });

        logger.info('📊 [useMFOs] Итоговый список после сортировки:', filtered.length, 'МФО');

        return filtered;
    }, [mfoList, amount, term, sortPriority]);

    // Логируем итоговый результат
    useEffect(() => {
        if (!loading && filteredAndSortedMfos.length === 0 && mfoList.length > 0) {
            logger.warn('⚠️ [useMFOs] ВНИМАНИЕ: Все МФО отфильтрованы!', {
                total: mfoList.length,
                filtered: filteredAndSortedMfos.length,
                amount,
                term
            });
        }
    }, [loading, filteredAndSortedMfos.length, mfoList.length, amount, term]);

    return {
        mfoList: filteredAndSortedMfos,
        loading,
        error,
        maxLoanAmount,
        fetchMfos
    };
};
