import { ImageResponse } from '@vercel/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const MAX_TITLE = 140
const MAX_DESCRIPTION = 220
const MAX_EYEBROW = 40
const MAX_BADGE = 40

// GitHub-style dot-per-type coloring, kept inside the two SciTeens
// brand greens so the card never looks off-brand.
const ACCENTS = {
  article: '#2D8A5B',
  course: '#00C853',
  project: '#00AD48',
  profile: '#236648',
  default: '#00C853',
}

// Runs under the Node.js runtime (not edge): self-hosted `next start`
// on Cloud Run doesn't implement the Vercel-only asset-fetch shim that
// `fetch(new URL(..., import.meta.url))` relies on in edge functions,
// so fonts are read from disk instead. Cached at module scope — read
// once per server process, reused across every request.
const FONT_DIR = join(process.cwd(), 'assets', 'fonts')
const font = (path) => readFileSync(join(FONT_DIR, path))

let fontCache
function loadFonts() {
  if (!fontCache) {
    fontCache = {
      regular: font('Inter-Regular.ttf'),
      semiBold: font('Inter-SemiBold.ttf'),
      bold: font('Inter-Bold.ttf'),
      extraBold: font('Inter-ExtraBold.ttf'),
      devanagariRegular: font(
        'NotoSansDevanagari-Regular.ttf'
      ),
      devanagariBold: font('NotoSansDevanagari-Bold.ttf'),
    }
  }
  return fontCache
}

// The SciTeens "st" mark (public/assets/sciteens_logo_initials.svg),
// inlined as vector paths so satori renders it crisply at any size
// without a network or filesystem image fetch.
function LogoMark({ size = 52 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 182 161"
      style={{ display: 'flex', flexShrink: 0 }}
    >
      <path
        fill="#FFFFFF"
        d="M75.78,90.08c0.74,0.26,1.64,0.5,2.73,0.76c-3.47,4.29-7.94,7.43-12.85,9.271C58.96,97.5,55.6,93.14,55.6,87.03c0-2.521,0.82-4.94,2.45-7.25c1.64-2.31,4.03-4.17,7.2-5.58c3.17-1.42,6.97-2.13,11.4-2.13c3.22,0,6.12,0.36,8.71,1.08c-0.2,3.9-1.16,7.79-2.91,11.47c-0.99-0.66-1.86-1.16-2.61-1.521c-0.83-0.39-1.89-0.58-3.19-0.58c-1.53,0-2.73,0.32-3.59,1.011c-0.86,0.67-1.3,1.529-1.3,2.58c0,0.92,0.26,1.68,0.79,2.26C73.07,88.96,74.15,89.53,75.78,90.08z"
      />
      <path
        fill="#FFFFFF"
        d="M100.48,106.58c0,0.07,0,0.13,0,0.2c0,4.63-2.051,8.3-6.141,11.05c-4.1,2.729-9.84,4.1-17.22,4.1c-1.99,0-3.83-0.109-5.55-0.33c-0.44-3.64,0.27-7.42,2.25-10.8h0.02c1.01,0.47,2.24,0.7,3.65,0.7c1.67,0,3.03-0.33,4.11-0.97c1.07-0.641,1.61-1.561,1.61-2.721c0-0.979-0.3-1.79-0.87-2.409c-0.38-0.391-0.97-0.771-1.78-1.16c5.42-2.931,12.22-2.9,17.76,0.68C99.1,105.42,99.81,105.97,100.48,106.58z"
      />
      <path
        fill="#00C853"
        d="M150.52,26.6c8.08,5.22,10.4,16.01,5.181,24.09s-16.01,10.4-24.09,5.18c-8.08-5.21-10.4-15.99-5.181-24.07C131.65,23.7,142.44,21.38,150.52,26.6z"
      />
      <path
        fill="#2D8A5B"
        d="M135.41,73.6c0.399,0.4,0.59,0.9,0.59,1.52c0,0.98,0,1.97,0,2.95c0,0.62-0.19,1.11-0.59,1.48c-0.41,0.37-0.91,0.56-1.53,0.56c-3.81,0-7.63,0-11.439,0c0,8.03,0,16.07,0,24.09c0,3.14,0.5,5.51,1.52,7.12c1.021,1.6,2.76,2.399,5.22,2.399c1.87,0,3.75,0,5.63,0c0.62,0,1.11,0.2,1.48,0.601c0.37,0.39,0.55,0.899,0.55,1.52c0,1.021,0,2.03,0,3.05c0,0.61-0.18,1.12-0.55,1.511c-0.37,0.409-0.86,0.609-1.48,0.609c-2.1,0-4.189,0-6.279,0c-9.53,0-14.311-5.39-14.311-16.149c0-8.261,0-16.5,0-24.74c-2.43,0-4.859,0-7.3,0c-0.61,0-1.1-0.19-1.47-0.56s-0.55-0.87-0.55-1.48c0-0.98,0-1.97,0-2.95c0-0.62,0.18-1.13,0.55-1.52c0.359-0.4,0.859-0.6,1.47-0.6c2.44,0,4.87,0,7.3,0c0-5.14,0-10.28,0-15.43c0-0.61,0.181-1.12,0.55-1.51c0.37-0.41,0.86-0.61,1.48-0.61c1.35,0,2.71,0,4.06,0c0.61,0,1.141,0.2,1.53,0.61c0.4,0.39,0.601,0.9,0.601,1.51c0,5.15,0,10.29,0,15.43C126.25,73,130.07,73,133.88,73C134.5,73,135,73.21,135.41,73.6z"
      />
      <path
        fill="#00C853"
        d="M100.48,106.58c6.31,5.59,7.739,15.12,3.02,22.42c-5.22,8.09-16,10.42-24.08,5.19c-4.53-2.921-7.27-7.61-7.85-12.591c1.72,0.221,3.56,0.33,5.55,0.33c7.38,0,13.12-1.37,17.22-4.1c4.09-2.75,6.141-6.42,6.141-11.05C100.48,106.71,100.48,106.65,100.48,106.58z"
      />
      <path
        fill="#2D8A5B"
        d="M100.48,106.58c-0.671-0.61-1.381-1.16-2.16-1.66c-5.54-3.58-12.34-3.61-17.76-0.68c-0.45-0.221-0.97-0.431-1.56-0.63c-1.62-0.591-4.1-1.19-7.42-1.801c-2.2-0.449-4.17-1.02-5.92-1.699c4.91-1.841,9.38-4.98,12.85-9.271c1.31,0.33,2.89,0.65,4.7,0.99c6.03,1.05,10.42,2.91,13.16,5.59C99.06,100.04,100.43,103.09,100.48,106.58z"
      />
      <path
        fill="#2D8A5B"
        d="M98.44,84.44c0,0.56-0.2,1.06-0.601,1.479c-0.39,0.44-0.87,0.64-1.43,0.64c-3.38,0-6.77,0-10.15,0c-0.56,0-1-0.119-1.3-0.35c-0.73-0.37-1.47-0.84-2.21-1.4c-0.11-0.06-0.21-0.13-0.3-0.189c1.75-3.68,2.71-7.57,2.91-11.47c1.04,0.26,2.02,0.6,2.97,1c3.29,1.39,5.81,3.05,7.53,4.99C97.58,81.08,98.44,82.85,98.44,84.44z"
      />
      <path
        fill="#00C853"
        d="M71.39,45.78c9.56,6.17,14.53,16.78,13.97,27.37c-2.59-0.72-5.49-1.08-8.71-1.08c-4.43,0-8.23,0.71-11.4,2.13c-3.17,1.41-5.56,3.27-7.2,5.58c-1.63,2.31-2.45,4.73-2.45,7.25c0,6.109,3.36,10.47,10.06,13.08c-8.79,3.34-18.97,2.59-27.48-2.9c-14.2-9.16-18.29-28.12-9.12-42.32C38.24,40.68,57.19,36.61,71.39,45.78z"
      />
      <path
        fill="#00C853"
        d="M80.51,88.11c-0.62,0.949-1.29,1.87-2,2.729c-1.09-0.26-1.99-0.5-2.73-0.76c-1.63-0.55-2.71-1.12-3.23-1.71c-0.53-0.58-0.79-1.34-0.79-2.26c0-1.051,0.44-1.91,1.3-2.58c0.86-0.69,2.06-1.011,3.59-1.011c1.3,0,2.36,0.19,3.19,0.58c0.75,0.36,1.62,0.86,2.61,1.521C81.89,85.81,81.25,86.97,80.51,88.11z"
      />
      <path
        fill="#00C853"
        d="M81.6,110.53c-1.08,0.64-2.44,0.97-4.11,0.97c-1.41,0-2.64-0.23-3.65-0.7h-0.02c0.13-0.229,0.26-0.46,0.41-0.689c1.64-2.551,3.84-4.53,6.33-5.87c0.81,0.39,1.4,0.77,1.78,1.16c0.57,0.619,0.87,1.43,0.87,2.409C83.21,108.97,82.67,109.89,81.6,110.53z"
      />
      <path
        fill="#2D8A5B"
        d="M73.82,110.8c-1.98,3.38-2.69,7.16-2.25,10.8c-2.67-0.34-5.03-0.93-7.1-1.79c-3.39-1.42-5.89-3.119-7.52-5.079c-1.64-1.971-2.45-3.761-2.45-5.351c0-0.63,0.24-1.13,0.69-1.53c0.46-0.399,0.97-0.6,1.53-0.6c3.72,0,7.44,0,11.17,0c0.37,0,0.67,0.12,0.92,0.37c1.05,0.68,1.62,1.08,1.75,1.2C71.73,109.68,72.81,110.34,73.82,110.8z"
      />
    </svg>
  )
}

function clamp(value, max) {
  if (!value) return undefined
  const str = String(value).trim()
  return str.length > max
    ? str.slice(0, max - 1).trimEnd() + '…'
    : str
}

export default async function handler(req, res) {
  try {
    const { searchParams } = new URL(
      req.url,
      'http://localhost'
    )

    const title =
      clamp(searchParams.get('title'), MAX_TITLE) ||
      'SciTeens'
    const description = clamp(
      searchParams.get('description'),
      MAX_DESCRIPTION
    )
    const eyebrow = clamp(
      searchParams.get('eyebrow'),
      MAX_EYEBROW
    )
    const badge = clamp(
      searchParams.get('badge'),
      MAX_BADGE
    )

    const accent =
      ACCENTS[eyebrow?.toLowerCase()] || ACCENTS.default

    const {
      regular,
      semiBold,
      bold,
      extraBold,
      devanagariRegular,
      devanagariBold,
    } = loadFonts()

    const textFontFamily = '"Inter", "Noto Sans Devanagari"'

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            position: 'relative',
            fontFamily: '"Inter"',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 10,
              display: 'flex',
              background:
                'linear-gradient(90deg, #2D8A5B 0%, #00C853 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: -110,
              bottom: -130,
              display: 'flex',
              opacity: 0.07,
              transform: 'rotate(-10deg)',
            }}
          >
            <LogoMark size={560} />
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '64px 76px 52px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <LogoMark size={50} />
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginLeft: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 25,
                      fontWeight: 800,
                      color: '#1f2937',
                      lineHeight: 1,
                    }}
                  >
                    SciTeens
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#9ca3af',
                      marginTop: 4,
                    }}
                  >
                    sciteens.com
                  </div>
                </div>
              </div>
              {eyebrow && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 20px',
                    borderRadius: 999,
                    backgroundColor: '#ECFDF3',
                    border: `1px solid ${accent}33`,
                    color: accent,
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {eyebrow}
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginTop: 32,
              }}
            >
              <div
                style={{
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 3,
                  overflow: 'hidden',
                  fontFamily: textFontFamily,
                  fontSize: title.length > 70 ? 52 : 62,
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.15,
                  letterSpacing: -1,
                }}
              >
                {title}
              </div>
              {description && (
                <div
                  style={{
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                    overflow: 'hidden',
                    fontFamily: textFontFamily,
                    fontSize: 27,
                    fontWeight: 400,
                    color: '#4b5563',
                    lineHeight: 1.4,
                    marginTop: 22,
                  }}
                >
                  {description}
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid #e5e7eb',
                paddingTop: 28,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    backgroundColor: accent,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    fontSize: 19,
                    fontWeight: 700,
                    color: '#374151',
                    marginLeft: 10,
                  }}
                >
                  {eyebrow ||
                    'Learning platform for teen scientists'}
                </div>
                {badge && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        fontSize: 19,
                        color: '#d1d5db',
                        margin: '0 10px',
                      }}
                    >
                      •
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        fontFamily: textFontFamily,
                        fontSize: 19,
                        fontWeight: 500,
                        color: '#6b7280',
                      }}
                    >
                      {badge}
                    </div>
                  </>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 18,
                  fontWeight: 700,
                  color: accent,
                }}
              >
                Science, simplified.
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Inter',
            data: regular,
            weight: 400,
            style: 'normal',
          },
          {
            name: 'Inter',
            data: semiBold,
            weight: 600,
            style: 'normal',
          },
          {
            name: 'Inter',
            data: bold,
            weight: 700,
            style: 'normal',
          },
          {
            name: 'Inter',
            data: extraBold,
            weight: 800,
            style: 'normal',
          },
          {
            name: 'Noto Sans Devanagari',
            data: devanagariRegular,
            weight: 400,
            style: 'normal',
          },
          {
            name: 'Noto Sans Devanagari',
            data: devanagariBold,
            weight: 700,
            style: 'normal',
          },
        ],
      }
    )

    const buffer = Buffer.from(
      await imageResponse.arrayBuffer()
    )
    res.setHeader('Content-Type', 'image/png')
    res.setHeader(
      'Cache-Control',
      'public, immutable, no-transform, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800'
    )
    res.status(200).send(buffer)
  } catch (e) {
    res
      .status(500)
      .send(`Failed to generate social card: ${e.message}`)
  }
}
