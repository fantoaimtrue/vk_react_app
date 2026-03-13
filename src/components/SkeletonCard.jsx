import { motion } from 'framer-motion';
import './SkeletonCard.css';

const SkeletonCard = () => {
  return (
    <motion.div
      className="skeleton-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="skeleton-card-header">
        <div className="skeleton-logo" />
        <div className="skeleton-info">
          <div className="skeleton-badge" />
          <div className="skeleton-name" />
        </div>
      </div>
      <div className="skeleton-card-body">
        <div className="skeleton-button" />
      </div>
    </motion.div>
  );
};

export const SkeletonCardList = ({ count = 6 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </>
  );
};

export default SkeletonCard;
