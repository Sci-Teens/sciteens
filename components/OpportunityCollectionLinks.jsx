import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { OPPORTUNITY_COLLECTIONS } from '@/lib/opportunityCollections'
import { buttonVariants } from '@/components/ui/button'

export default function OpportunityCollectionLinks({
  exclude,
}) {
  const { t } = useTranslation('common')

  return (
    <ul className="flex flex-wrap gap-2">
      {OPPORTUNITY_COLLECTIONS.filter(
        ({ slug }) => slug !== exclude
      ).map(({ slug, key }) => (
        <li key={slug}>
          <Link
            href={`/opportunities/${slug}`}
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className:
                'h-auto whitespace-normal text-left',
            })}
          >
            {t(
              `opportunity_collections.pages.${key}.label`
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
