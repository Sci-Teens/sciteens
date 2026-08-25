import { cn } from '@/lib/utils'
import { getFieldIcon } from '@/lib/fieldIcons'

const MAX_TILES = 4

function getFieldTiles(fields) {
  return (fields.length ? fields : ['']).slice(0, MAX_TILES)
}

export default function OpportunityFieldIcons({
  fields = [],
  size = 'sm',
}) {
  const fieldTiles = getFieldTiles(fields)
  const isFullBleedSingleTile = fieldTiles.length === 1
  const tileGridColumns = isFullBleedSingleTile
    ? 'grid-cols-1'
    : 'grid-cols-2'
  const iconSize =
    size === 'lg'
      ? isFullBleedSingleTile
        ? 'h-12 w-12 md:h-16 md:w-16'
        : 'h-7 w-7 md:h-9 md:w-9'
      : isFullBleedSingleTile
      ? 'h-10 w-10 md:h-14 md:w-14'
      : 'h-5 w-5 md:h-7 md:w-7'

  return (
    <div
      className={cn('grid h-full w-full', tileGridColumns)}
    >
      {fieldTiles.map((field, index) => {
        const { Icon, bg, fg } = getFieldIcon(field)
        return (
          <div
            key={`${field}-${index}`}
            className={cn(
              'flex items-center justify-center',
              bg
            )}
          >
            <Icon
              className={cn(iconSize, fg)}
              aria-hidden="true"
            />
          </div>
        )
      })}
    </div>
  )
}
