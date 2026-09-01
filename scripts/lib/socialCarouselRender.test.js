import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

import {
  renderSlidePng,
  SOCIAL_CARD_HEIGHT,
  SOCIAL_CARD_WIDTH,
} from './socialCarouselRender.mjs'

const opportunitySlide = {
  type: 'opportunity',
  name: 'ACS Project SEED Program',
  deadlineLabel: 'Sep 2',
  fields: ['Chemistry', 'Research'],
}

async function renderOpportunitySlide(description) {
  return renderSlidePng({
    slide: { ...opportunitySlide, description },
    position: 1,
    total: 1,
  })
}

describe('renderSlidePng', () => {
  it('renders a full-size program card with its description', async () => {
    const [withoutDescription, withDescription] =
      await Promise.all([
        renderOpportunitySlide(''),
        renderOpportunitySlide(
          'High school students conduct research with professional scientists.'
        ),
      ])
    const metadata = await sharp(withDescription).metadata()

    expect(metadata).toMatchObject({
      width: SOCIAL_CARD_WIDTH,
      height: SOCIAL_CARD_HEIGHT,
      format: 'png',
    })
    expect(withDescription.equals(withoutDescription)).toBe(
      false
    )
  })
})
