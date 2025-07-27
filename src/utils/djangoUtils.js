// Эта функция преобразует ответ от Django REST Framework
// в формат, понятный для React-компонентов.
export const mapDjangoMfo = (djangoMfo) => {
  const transformed = { ...djangoMfo };

  // Превращаем строки, разделенные точкой с запятой, обратно в массивы.
  // Если поле пустое или отсутствует, создаем пустой массив.
  transformed.requirements = djangoMfo.requirements ? djangoMfo.requirements.split(';').map(s => s.trim()) : [];
  transformed.get_methods = djangoMfo.get_methods ? djangoMfo.get_methods.split(';').map(s => s.trim()) : [];
  transformed.repay_methods = djangoMfo.repay_methods ? djangoMfo.repay_methods.split(';').map(s => s.trim()) : [];

  return transformed;
}; 