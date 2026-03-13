import { useEffect } from 'react';
import './HelpModal.css';

const HelpModal = ({ isOpen, onClose }) => {
  // Блокируем прокрутку body когда модальное окно открыто
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрыть">×</button>
        <h2 className="modal-title">Почему отказывают в займе?</h2>
        <div className="modal-body">
          <div className="help-tip">
            <h3>Подавайте заявки в несколько МФО</h3>
            <p>Оставляйте заявки сразу в <strong>3-4 сервисах</strong>. Это значительно увеличивает шансы на одобрение, так как у каждой компании свои критерии оценки.</p>
          </div>
          <div className="help-tip">
            <h3>Доход указывайте больше 300К</h3>
            <p><strong>МФО это не проверяют.</strong> Указывайте ежемесячный доход от 300 000 рублей - это повышает шанс одобрения.</p>
          </div>
          <div className="help-tip">
            <h3>Заполняйте все поля анкеты</h3>
            <p>Чем полнее информация о вас, тем выше вероятность одобрения. Указывайте контактные данные, место работы и другие сведения.</p>
          </div>
          <div className="help-tip">
            <h3>Используйте наш бот</h3>
            <p>В нашем боте вы получите персональные рекомендации и эксклюзивные предложения.</p>
            <a
              href="https://vk.me/utkavalyutka"
              target="_blank"
              rel="noopener noreferrer"
              className="modal-bot-link"
            >
              Перейти в бот ВК
            </a>
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="modal-understand-button"
            onClick={onClose}
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
