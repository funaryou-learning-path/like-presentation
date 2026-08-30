// @ts-nocheck
import { motion } from 'framer-motion'
import type { SlideProps } from '../../../types/presentation'

export default function Part2TitleSlide({ activeIndex, isSpeaking }: SlideProps) {
  const isHighlight = isSpeaking && activeIndex === 0
  return (
    <div className="slide-container bg-gradient-to-br from-[#0d1f0d] via-[#1a3a1a] to-[#0d1f0d]">
      <motion.div className="slide-content text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="inline-block px-4 py-1.5 rounded-full bg-primary-700/30 border border-primary-500/30 text-primary-300 text-sm tracking-wider mb-8">PRESENTATION</div>
        <h1 className={`text-5xl md:text-6xl font-black leading-tight transition-all duration-500 ${isHighlight ? 'scale-[1.02] drop-shadow-[0_0_20px_rgba(74,222,128,0.3)] text-white' : 'text-white'}`}>
          Part2 伊藤園プレゼン
        </h1>
        <p className="mt-6 text-white/40">～ part2 ～</p>
      </motion.div>
    </div>
  )
}
