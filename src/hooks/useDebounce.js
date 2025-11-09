import { useEffect, useState } from 'react';

/**
 * Хук для "отложенного" значения (debounce).
 * Полезен для инпутов, которые вызывают частые обновления.
 * @param {any} value - Значение, которое нужно "отложить".
 * @param {number} delay - Задержка в миллисекундах.
 * @returns {any} Отложенное значение.
 */
function useDebounce(value, delay) {
  // Состояние для хранения отложенного значения
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(
    () => {
      // Устанавливаем таймер, который обновит отложенное значение
      // после указанной задержки
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      // Очищаем таймер при каждом новом значении или при размонтировании компонента
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delay] // Перезапускаем эффект только если изменилось значение или задержка
  );

  return debouncedValue;
}

export default useDebounce;
