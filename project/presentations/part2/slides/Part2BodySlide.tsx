// @ts-nocheck
import { motion } from 'framer-motion'
import type { SlideProps } from '../../../types/presentation'

export default function Part2BodySlide({ activeIndex, isSpeaking }: SlideProps) {
  return (
    <div className="slide-container bg-gradient-to-br from-[#0a1a0a] to-[#0f240f]">
      <motion.div className="slide-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">本題</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => {
            const isHighlighted = isSpeaking && activeIndex === i
            return (
              <div key={i} className={`p-6 rounded-xl border transition-all duration-500 ${isHighlighted ? 'border-primary-400 bg-primary-800/30 ring-2 ring-primary-400/20 scale-[1.03]' : 'border-white/5 bg-white/[0.03]'}`}>
                <div className="text-primary-300 font-mono text-sm">0{i + 1}</div>
                <div className={`font-bold ${isHighlighted ? 'text-primary-200' : 'text-white'}`}>ポイント{i + 1}</div>
                <p className="text-white/40 text-sm mt-1">ここに内容を記述</p>
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
