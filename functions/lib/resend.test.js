import { describe, expect, it, vi } from 'vitest'

const { verifyEmailTemplate } = require('./emailTemplates')
const {
  assertEmailSent,
  buildResendEmailPayload,
  buildNewsletterBroadcastPayload,
} = require('./resend')

describe('buildResendEmailPayload', () => {
  it('forwards a React template to Resend', () => {
    const react = verifyEmailTemplate({
      link: 'https://sciteens.org/verify?oobCode=abc123',
    })

    expect(
      buildResendEmailPayload({
        to: 'ada@example.org',
        subject: 'Verify Email',
        react,
      })
    ).toEqual({
      from: 'SciTeens <noreply@sciteens.org>',
      to: 'ada@example.org',
      subject: 'Verify Email',
      react,
    })
  })
})

describe('buildNewsletterBroadcastPayload', () => {
  it('targets the newsletter segment and topic with React content', () => {
    const react = verifyEmailTemplate({
      link: 'https://sciteens.org/verify?oobCode=abc123',
    })

    expect(
      buildNewsletterBroadcastPayload({
        segmentId: 'segment_123',
        topicId: 'topic_123',
        name: 'September 2026',
        subject: 'September at SciTeens',
        react,
        send: false,
      })
    ).toEqual({
      segmentId: 'segment_123',
      topicId: 'topic_123',
      from: 'SciTeens <noreply@sciteens.org>',
      name: 'September 2026',
      subject: 'September at SciTeens',
      react,
    })
  })
})

describe('assertEmailSent', () => {
  it('returns a successful Resend result', () => {
    const result = {
      data: { id: 'email_123' },
      error: null,
    }

    expect(assertEmailSent(result)).toBe(result)
  })

  it('throws a Resend delivery error', () => {
    const error = {
      message: 'Sender domain is not verified',
    }
    const errorLog = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    expect(() =>
      assertEmailSent({ data: null, error })
    ).toThrow(
      'Resend rejected the email: Sender domain is not verified'
    )
    expect(errorLog).toHaveBeenCalledWith(
      'Resend email send error:',
      error
    )
    errorLog.mockRestore()
  })
})
