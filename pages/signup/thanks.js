import Link from 'next/link'
import Image from 'next/image'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import AuthCard from '@/components/AuthCard'

export default function SignUpThanks() {
  const { t } = useTranslation('common')
  return (
    <AuthCard
      maxWidth="max-w-lg"
      title={t('auth.thanks_for_signing_up')}
      subtitle={
        <>
          {t('auth.send_confirmation')}&nbsp;
          <Link href="/articles" className="underline">
            {t('auth.articles')}
          </Link>
          &nbsp;{t('auth.or')}&nbsp;
          <Link href="/projects" className="underline">
            {t('auth.projects')}
          </Link>
          &nbsp;
          {t('auth.for_inspiration')}
        </>
      }
      className="text-center"
    >
      <Image
        src="/assets/sciteens_logo_main.svg"
        alt="SciTeens Logo Main"
        width={220}
        height={68}
        unoptimized
        className="mx-auto mb-6"
      />
      <div className="bg-sciteensGreen-regular mx-auto flex w-fit flex-row rounded-lg p-2">
        <a
          href="https://www.facebook.com/SciTeensinfo"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            className="text-sciteensGreen-regular mr-4 h-6 w-auto"
            src="/assets/icons/facebook-flat.svg"
            alt="Facebook"
            width={24}
            height={24}
            unoptimized
          />
        </a>
        <a
          href="https://www.instagram.com/sci.teens/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            className="mr-4 h-6 w-auto"
            src="/assets/icons/instagram.svg"
            alt="Instagram"
            width={24}
            height={24}
            unoptimized
          />
        </a>
        <a
          href="https://www.linkedin.com/company/sciteens/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            className="mr-4 h-6 w-auto"
            src="/assets/icons/linkedin-flat.svg"
            alt="LinkedIn"
            width={26}
            height={24}
            unoptimized
          />
        </a>
        <a
          href="https://www.youtube.com/channel/UCXnyAT9TOrXywV0M6HbhaRA"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            className="mr-4 h-6 w-auto"
            src="/assets/icons/youtube.svg"
            alt="YouTube"
            width={24}
            height={24}
            unoptimized
          />
        </a>
        <a
          href="https://www.tiktok.com/@sciteens"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            className="mr-4 h-6 w-auto"
            src="/assets/icons/tiktok.svg"
            alt="TikTok"
            width={24}
            height={24}
            unoptimized
          />
        </a>
        <a
          href="https://discord.gg/QuS4fjePK6"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            className="h-6 w-auto"
            src="/assets/icons/discord.svg"
            alt="Discord"
            width={31}
            height={24}
            unoptimized
          />
        </a>
      </div>
    </AuthCard>
  )
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}
