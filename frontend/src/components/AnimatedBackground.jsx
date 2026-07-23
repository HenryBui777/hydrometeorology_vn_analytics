import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sun, Moon, CloudRain, Wind, 
  ThermometerSun, Waves, Droplets, Tornado, CloudLightning
} from 'lucide-react';

export default function AnimatedBackground() {
  return (
    <div className="flex-1 hidden md:flex items-center justify-center gap-6 overflow-hidden h-full">
      <motion.div 
        animate={{ y: [0, -4, 0] }} 
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} 
        className="w-8 h-8 flex items-center justify-center opacity-70"
      >
        <Sun className="w-5 h-5 text-amber-500" />
      </motion.div>

      <motion.div 
        animate={{ y: [0, 4, 0] }} 
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }} 
        className="w-8 h-8 flex items-center justify-center opacity-70"
      >
        <CloudRain className="w-5 h-5 text-blue-500" />
      </motion.div>

      <motion.div 
        animate={{ y: [0, -3, 0], x: [0, 2, 0] }} 
        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 1 }} 
        className="w-8 h-8 flex items-center justify-center opacity-70"
      >
        <Wind className="w-5 h-5 text-slate-500 dark:text-slate-400" />
      </motion.div>

      <motion.div 
        animate={{ y: [0, 5, 0] }} 
        transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1.5 }} 
        className="w-8 h-8 flex items-center justify-center opacity-70"
      >
        <CloudLightning className="w-5 h-5 text-purple-500" />
      </motion.div>

      <motion.div 
        animate={{ y: [0, -5, 0] }} 
        transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut", delay: 2 }} 
        className="w-8 h-8 flex items-center justify-center opacity-70"
      >
        <ThermometerSun className="w-5 h-5 text-pink-500" />
      </motion.div>

      <motion.div 
        animate={{ y: [0, 3, 0] }} 
        transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut", delay: 0.8 }} 
        className="w-8 h-8 flex items-center justify-center opacity-70"
      >
        <Waves className="w-5 h-5 text-emerald-500" />
      </motion.div>

      <motion.div 
        animate={{ y: [0, -4, 0] }} 
        transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut", delay: 2.5 }} 
        className="w-8 h-8 flex items-center justify-center opacity-70"
      >
        <Tornado className="w-5 h-5 text-orange-500" />
      </motion.div>

      <motion.div 
        animate={{ y: [0, 4, 0] }} 
        transition={{ repeat: Infinity, duration: 4.8, ease: "easeInOut", delay: 1.2 }} 
        className="w-8 h-8 flex items-center justify-center opacity-70"
      >
        <Droplets className="w-5 h-5 text-cyan-500" />
      </motion.div>
    </div>
  );
}
