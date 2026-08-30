// @ts-nocheck
import { motion } from 'framer-motion'
import type { SlideProps } from '../../../types/presentation'

export default function Part2SummarySlide({ activeIndex, isSpeaking }: SlideProps) {
  const isHighlight = isSpeaking && activeIndex === 0
  return (
    <div className="slide-container bg-gradient-to-br from-[#0d1f0d] via-[#1a3a1a] to-[#0d1f0d]">
      <motion.div className="slide-content text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">まとめ</h2>
        <div className={`inline-block p-6 rounded-2xl border transition-all duration-500 ${isHighlight ? 'border-primary-400 bg-primary-800/30 ring-2 ring-primary-400/20 scale-[1.03]' : 'border-primary-500/20 bg-primary-900/10'}`}>
          <p className="text-white font-bold">ご清聴ありがとうございました</p>
        </div>
      </motion.div>
    </div>
  )
}
