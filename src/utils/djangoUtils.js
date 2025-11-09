// Эта функция преобразует ответ от Django REST Framework
// в формат, понятный для React-компонентов.
export const mapDjangoMfo = (djangoMfo) => {
  try {
    const transformed = { ...djangoMfo };

    // Превращаем строки, разделенные точкой с запятой, обратно в массивы.
    // Если поле пустое или отсутствует, создаем пустой массив.
    // Добавляем дополнительную защиту от некорре-ктных данных
    transformed.requirements = (djangoMfo.requirements && typeof djangoMfo.requirements === 'string')
      ? djangoMfo.requirements.split(';').map(s => s.trim()).filter(Boolean)
      : Array.isArray(djangoMfo.requirements) ? djangoMfo.requirements : [];

    transformed.get_methods = (djangoMfo.get_methods && typeof djangoMfo.get_methods === 'string')
      ? djangoMfo.get_methods.split(';').map(s => s.trim()).filter(Boolean)
      : Array.isArray(djangoMfo.get_methods) ? djangoMfo.get_methods : [];

    transformed.repay_methods = (djangoMfo.repay_methods && typeof djangoMfo.repay_methods === 'string')
      ? djangoMfo.repay_methods.split(';').map(s => s.trim()).filter(Boolean)
      : Array.isArray(djangoMfo.repay_methods) ? djangoMfo.repay_methods : [];

    // Проверяем и нормализуем числовые значения
    transformed.sum_min = Number(djangoMfo.sum_min) || 0;
    transformed.sum_max = Number(djangoMfo.sum_max) || 0;
    transformed.term_min = Number(djangoMfo.term_min) || 0;
    transformed.term_max = Number(djangoMfo.term_max) || 0;
    transformed.rate = Number(djangoMfo.rate) || 0;
    transformed.approval_chance = Number(djangoMfo.approval_chance) || 0;
    transformed.payout_speed_hours = Number(djangoMfo.payout_speed_hours) || 0;

    return transformed;
  } catch (error) {
    console.error('Error in mapDjangoMfo:', error, 'Data:', djangoMfo);
    // Возвращаем базовые данные если произошла ошибка
    return {
      id: djangoMfo.id || 0,
      name: djangoMfo.name || 'Неизвестно',
      logo_url: djangoMfo.logo_url || '',
      link: djangoMfo.link || '',
      sum_min: Number(djangoMfo.sum_min) || 0,
      sum_max: Number(djangoMfo.sum_max) || 0,
      term_min: Number(djangoMfo.term_min) || 0,
      term_max: Number(djangoMfo.term_max) || 0,
      rate: Number(djangoMfo.rate) || 0,
      approval_chance: Number(djangoMfo.approval_chance) || 0,
      payout_speed_hours: Number(djangoMfo.payout_speed_hours) || 0,
      requirements: [],
      get_methods: [],
      repay_methods: []
    };
  }
}; 