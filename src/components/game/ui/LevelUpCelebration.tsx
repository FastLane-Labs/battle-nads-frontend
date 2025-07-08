import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Text, VStack, Flex } from '@chakra-ui/react';

interface LevelUpCelebrationProps {
  level: number;
  unspentPoints: number;
  onClose?: () => void;
}

export const LevelUpCelebration: React.FC<LevelUpCelebrationProps> = ({
  level,
  unspentPoints,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  // Auto-close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 flex items-center justify-center z-50"
          onClick={handleClose}
          style={{ 
            perspective: "1000px",
            cursor: "pointer",
            backdropFilter: "brightness(0.7)"
          }}
        >
          <motion.div
            initial={{ rotateX: -30 }}
            animate={{ 
              rotateX: 0,
              transition: { duration: 0.5 }
            }}
            className="relative"
            onClick={e => e.stopPropagation()}
            style={{ cursor: "default" }}
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-yellow-900/30 blur-xl rounded-full scale-150" />
            
            {/* Main content */}
            <Box
              className="relative bg-[#2A1810] border-2 border-amber-800/80 rounded-lg p-8 text-center shadow-xl"
              style={{
                boxShadow: '0 0 30px rgba(120, 53, 15, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.4)'
              }}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-2 right-2 w-6 h-6 text-amber-500/40 hover:text-amber-500/60 transition-colors flex items-center justify-center"
              >
                ×
              </button>

              <VStack spacing={6}>
                <motion.div
                  initial={{ y: -20 }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Text className="text-amber-200/90 text-sm font-serif uppercase tracking-wider mb-3">
                    CONGRATULATIONS!
                  </Text>
                  <Text className="gold-text text-5xl font-serif font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    Level {level}
                  </Text>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-amber-900/20 blur-md rounded-lg animate-pulse-slow" />
                  <Box className="relative bg-[#1A0F0A] rounded-lg p-6 border border-amber-900/40">
                    <Text className="text-amber-200/90 text-xl font-serif mb-2">
                      Attribute Points Available
                    </Text>
                    <Flex align="center" justify="center" gap={2}>
                      <Text className="gold-text text-4xl font-serif font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                        {unspentPoints}
                      </Text>
                    </Flex>
                  </Box>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <Text className="text-amber-200/70 text-sm font-serif italic">
                    Allocate your points to become more powerful!
                  </Text>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  transition={{ duration: 0.3, delay: 1 }}
                >
                  <Text className="text-amber-200/50 text-xs font-serif">
                    Click anywhere to continue
                  </Text>
                </motion.div>
              </VStack>
            </Box>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 