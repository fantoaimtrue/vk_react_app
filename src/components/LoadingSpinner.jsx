import { motion } from 'framer-motion';
import './LoadingSpinner.css';

const spinnerVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

const LoadingSpinner = ({ size = 'medium', text = 'Загрузка...' }) => {
  const sizeMap = {
    small: '24px',
    medium: '40px',
    large: '60px',
  };

  return (
    <div className="loading-spinner-container">
      <motion.div
        className="loading-spinner"
        variants={spinnerVariants}
        animate="animate"
        style={{
          width: sizeMap[size] || sizeMap.medium,
          height: sizeMap[size] || sizeMap.medium,
        }}
      >
        <div className="spinner-circle" />
      </motion.div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
