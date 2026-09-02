import { describe, expect, it, vi } from 'vitest'

const { verifyEmailTemplate } = require('./emailTemplates')
const {
  assertEmailSent,
  buildResendEmailPayload,
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
