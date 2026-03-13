import { motion } from 'framer-motion';

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  hover: {
    y: -4,
    scale: 1.01,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

const AnimatedCard = ({ children, index = 0, className = '' }) => {
  return (
    <motion.div
      className={className}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      transition={{
        delay: index * 0.05,
        duration: 0.4,
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard;
