import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement as h } from 'react'
import { ImageResponse } from '@vercel/og'

const ASSET_DIR = join(process.cwd(), 'assets/fonts')
const LOGO_PATH = join(
  process.cwd(),
  'public/assets/sciteens_logo_initials.svg'
)
const WIDTH = 1080
const HEIGHT = 1350
const DISPLAY_FAMILY = '"Archivo", "Anek Devanagari"'
const TEXT_FAMILY = '"Figtree", "Anek Devanagari"'

const logoSvg = readFileSync(LOGO_PATH, 'utf8')
const lightLogoDataUrl = `data:image/svg+xml;base64,${Buffer.from(
  logoSvg.replaceAll('#FFFFFF', '#236648')
).toString('base64')}`

let fontCache
function loadFonts() {
  if (!fontCache) {
    fontCache = {
      archivoExtraBold: readFileSync(
        join(ASSET_DIR, 'Archivo-ExtraBold.ttf')
      ),
      figtreeRegular: readFileSync(
        join(ASSET_DIR, 'Figtree-Regular.ttf')
      ),
      figtreeSemiBold: readFileSync(
        join(ASSET_DIR, 'Figtree-SemiBold.ttf')
      ),
      figtreeBold: readFileSync(
        join(ASSET_DIR, 'Figtree-Bold.ttf')
      ),
      devanagariRegular: readFileSync(
        join(ASSET_DIR, 'AnekDevanagari-Regular.ttf')
      ),
      devanagariBold: readFileSync(
        join(ASSET_DIR, 'AnekDevanagari-Bold.ttf')
      ),
    }
  }
  return fontCache
}

function clampText(value, maxLength) {
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

function LogoMark() {
  return h('img', {
    src: lightLogoDataUrl,
    width: 76,
    height: 68,
    alt: '',
    style: { display: 'flex' },
  })
}

function Squiggle({ width = 410 }) {
  return h(
    'svg',
    {
      width,
      height: 42,
      viewBox: `0 0 ${width} 42`,
      fill: 'none',
      style: { display: 'flex', marginTop: 8 },
    },
    h('path', {
      d: `M4 22 C ${width * 0.14} 3, ${width * 0.24} 40, ${
        width * 0.38
      } 21 S ${width * 0.64} 3, ${width * 0.76} 22 S ${
        width * 0.91
      } 39, ${width - 4} 18`,
      stroke: '#00C853',
      strokeWidth: 14,
      strokeLinecap: 'round',
    })
  )
}

function CoverSlide({ slide }) {
  const subline = slide.part
    ? `${slide.programCount} programs · ${slide.deadlineWindow} · Part ${slide.part} of ${slide.totalParts}`
    : `${slide.programCount} programs · ${slide.deadlineWindow}`

  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5fff5',
        color: '#10251a',
        padding: '72px',
      },
    },
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      },
      LogoMark(),
      h(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: TEXT_FAMILY,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: -0.3,
            color: '#236648',
          },
        },
        'SCI TEENS'
      )
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          marginTop: 28,
        },
      },
      h(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: DISPLAY_FAMILY,
            fontSize: 108,
            fontWeight: 800,
            letterSpacing: -5,
            lineHeight: 0.9,
          },
        },
        'Upcoming'
      ),
      h(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: DISPLAY_FAMILY,
            fontSize: 108,
            fontWeight: 800,
            letterSpacing: -5,
            lineHeight: 0.9,
            marginTop: 16,
          },
        },
        'program'
      ),
      h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginTop: 16,
          },
        },
        h(
          'div',
          {
            style: {
              display: 'flex',
              fontFamily: DISPLAY_FAMILY,
              fontSize: 108,
              fontWeight: 800,
              letterSpacing: -5,
              lineHeight: 0.9,
            },
          },
          'deadlines'
        ),
        Squiggle({ width: 550 })
      )
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          paddingTop: 36,
          borderTop: '2px solid #236648',
        },
      },
      h(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: TEXT_FAMILY,
            fontSize: 31,
            fontWeight: 700,
            color: '#236648',
          },
        },
        `Week of ${slide.week}`
      ),
      h(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: TEXT_FAMILY,
            fontSize: 25,
            fontWeight: 500,
            color: '#4d6856',
          },
        },
        subline
      )
    )
  )
}

function OpportunitySlide({
  slide,
  imageUrl,
  position,
  total,
}) {
  const topics = Array.isArray(slide.fields)
    ? slide.fields.join(' · ')
    : ''

  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#163c2a',
        color: '#ffffff',
      },
    },
    imageUrl &&
      h('img', {
        src: imageUrl,
        width: String(WIDTH),
        height: String(HEIGHT),
        alt: '',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        },
      }),
    h('div', {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        background:
          'linear-gradient(180deg, rgba(5, 22, 14, 0.22) 0%, rgba(5, 22, 14, 0.42) 39%, rgba(5, 22, 14, 0.96) 100%)',
      },
    }),
    h(
      'div',
      {
        style: {
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 72px',
        },
      },
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        },
        LogoMark(),
        h(
          'div',
          {
            style: {
              display: 'flex',
              fontFamily: TEXT_FAMILY,
              fontSize: 25,
              fontWeight: 700,
              letterSpacing: 0.3,
            },
          },
          `${String(position).padStart(2, '0')} / ${String(
            total
          ).padStart(2, '0')}`
        )
      ),
      h('div', { style: { display: 'flex', flex: 1 } }),
      h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 870,
          },
        },
        h(
          'div',
          {
            style: {
              display: 'flex',
              fontFamily: TEXT_FAMILY,
              fontSize: 25,
              fontWeight: 700,
              letterSpacing: 1.2,
              color: '#8fffb8',
            },
          },
          'APPLICATION DEADLINE'
        ),
        h(
          'div',
          {
            style: {
              display: 'flex',
              fontFamily: DISPLAY_FAMILY,
              fontSize: 112,
              fontWeight: 800,
              letterSpacing: -5,
              lineHeight: 0.9,
              marginTop: 18,
            },
          },
          slide.deadlineLabel
        ),
        Squiggle({ width: 390 }),
        h(
          'div',
          {
            style: {
              display: 'flex',
              fontFamily: DISPLAY_FAMILY,
              fontSize: 58,
              fontWeight: 800,
              letterSpacing: -2.2,
              lineHeight: 1,
              marginTop: 22,
            },
          },
          clampText(slide.name, 62)
        ),
        topics
          ? h(
              'div',
              {
                style: {
                  display: 'flex',
                  fontFamily: TEXT_FAMILY,
                  fontSize: 25,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  color: '#c8e7d3',
                  marginTop: 24,
                },
              },
              topics
            )
          : null
      )
    )
  )
}

export async function renderSlidePng({
  slide,
  imageUrl,
  position,
  total,
}) {
  const fonts = loadFonts()
  const response = new ImageResponse(
    slide.type === 'cover'
      ? CoverSlide({ slide })
      : OpportunitySlide({
          slide,
          imageUrl,
          position,
          total,
        }),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: 'Archivo',
          data: fonts.archivoExtraBold,
          weight: 800,
          style: 'normal',
        },
        {
          name: 'Figtree',
          data: fonts.figtreeRegular,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Figtree',
          data: fonts.figtreeSemiBold,
          weight: 600,
          style: 'normal',
        },
        {
          name: 'Figtree',
          data: fonts.figtreeBold,
          weight: 700,
          style: 'normal',
        },
        {
          name: 'Anek Devanagari',
          data: fonts.devanagariRegular,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Anek Devanagari',
          data: fonts.devanagariBold,
          weight: 700,
          style: 'normal',
        },
      ],
    }
  )
  return Buffer.from(await response.arrayBuffer())
}

export const SOCIAL_CARD_WIDTH = WIDTH
export const SOCIAL_CARD_HEIGHT = HEIGHT
