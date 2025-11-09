/**
 * Утилита для логирования с поддержкой различных окружений
 * В продакшене логи отключены, в разработке - включены
 */

const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;

/**
 * Логгер для проекта
 * Автоматически отключает console.log в production
 */
export const logger = {
  /**
   * Информационные логи (включены только в development)
   * @param {...any} args - аргументы для логирования
   */
  info: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Логи с предупреждениями (включены только в development)
   * @param {...any} args - аргументы для логирования
   */
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Логи ошибок (всегда включены, критичны для отладки)
   * @param {...any} args - аргументы для логирования
   */
  error: (...args) => {
    console.error(...args);
    
    // В продакшене можно отправлять в Sentry или другую систему мониторинга
    if (!isDevelopment && window.Sentry) {
      const errorMessage = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      window.Sentry.captureMessage(errorMessage, 'error');
    }
  },

  /**
   * Дебаг логи (только в development)
   * @param {...any} args - аргументы для логирования
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Логирование таблиц (только в development)
   * @param {any} data - данные для отображения в виде таблицы
   */
  table: (data) => {
    if (isDevelopment && console.table) {
      console.table(data);
    }
  },

  /**
   * Группировка логов (только в development)
   * @param {string} label - метка группы
   */
  group: (label) => {
    if (isDevelopment && console.group) {
      console.group(label);
    }
  },

  /**
   * Закрытие группы логов
   */
  groupEnd: () => {
    if (isDevelopment && console.groupEnd) {
      console.groupEnd();
    }
  },

  /**
   * Измерение времени выполнения (только в development)
   * @param {string} label - метка таймера
   */
  time: (label) => {
    if (isDevelopment && console.time) {
      console.time(label);
    }
  },

  /**
   * Окончание измерения времени
   * @param {string} label - метка таймера
   */
  timeEnd: (label) => {
    if (isDevelopment && console.timeEnd) {
      console.timeEnd(label);
    }
  },
};

/**
 * Экспорт для использования как дефолтный
 */
export default logger;

/**
 * Вспомогательная функция для логирования HTTP запросов
 * @param {string} method - HTTP метод (GET, POST, и т.д.)
 * @param {string} url - URL запроса
 * @param {any} data - данные запроса
 */
export const logRequest = (method, url, data = null) => {
  if (isDevelopment) {
    console.log(`🌐 ${method} ${url}`, data || '');
  }
};

/**
 * Вспомогательная функция для логирования HTTP ответов
 * @param {string} method - HTTP метод
 * @param {string} url - URL запроса
 * @param {any} response - ответ сервера
 * @param {number} status - статус код
 */
export const logResponse = (method, url, response, status) => {
  if (isDevelopment) {
    const emoji = status >= 200 && status < 300 ? '✅' : '❌';
    console.log(`${emoji} ${method} ${url} [${status}]`, response);
  }
};

/**
 * Вспомогательная функция для логирования ошибок HTTP
 * @param {string} method - HTTP метод
 * @param {string} url - URL запроса
 * @param {Error} error - объект ошибки
 */
export const logError = (method, url, error) => {
  console.error(`❌ ${method} ${url} ERROR:`, error);
  
  if (!isDevelopment && window.Sentry) {
    window.Sentry.captureException(error, {
      tags: {
        method,
        url
      }
    });
  }
};

