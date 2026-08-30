import type { SlideScript } from '../../types/presentation'

export const scripts: SlideScript[] = [
  {
    slideId: 'part2-title',
    script: '[hl:0]Part2 伊藤園プレゼンへようこそ。[hl:-1]このプレゼンは part2 のサンプルです。',
    durationSec: 15,
  },
  {
    slideId: 'part2-body',
    script: '本題です。[hl:0]ポイント1、[hl:1]ポイント2、[hl:2]ポイント3、[hl:-1]以上です。',
    durationSec: 30,
  },
  {
    slideId: 'part2-summary',
    script: '[hl:0]まとめです。[hl:-1]ご清聴ありがとうございました。',
    durationSec: 15,
  },
]
