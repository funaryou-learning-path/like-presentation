import Part2TitleSlide from './slides/Part2TitleSlide'
import Part2BodySlide from './slides/Part2BodySlide'
import Part2SummarySlide from './slides/Part2SummarySlide'
import { meta } from './meta'
import { scripts } from './scripts'
import type { Presentation } from '../../types/presentation'

export const part2Presentation: Presentation = {
  meta,
  slides: [Part2TitleSlide, Part2BodySlide, Part2SummarySlide],
  scripts,
  slideIds: ['part2-title', 'part2-body', 'part2-summary'],
}

export { meta, scripts }
export default part2Presentation
