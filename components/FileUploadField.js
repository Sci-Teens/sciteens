import { useState } from 'react'
import { useTranslation } from 'next-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import File from './File'

// Shared drag-and-drop upload zone + "which one is the display
// photo" gallery for the profile and project create/edit forms —
// one implementation instead of three near-identical copies drifting
// out of sync. `entries[0]` is always the current display photo;
// `getFile` maps an entry to the shape File.js expects (an
// already-uploaded record or a freshly dropped, not-yet-uploaded
// File/Blob).
export default function FileUploadField({
  dropzone,
  error,
  entries,
  getFile,
  getKey,
  onRemove,
  onSetPhoto,
  photoLabel,
  emptyHint,
}) {
  const { t } = useTranslation('common')
  const [selectMode, setSelectMode] = useState(false)
  const { getRootProps, getInputProps, isDragActive } =
    dropzone
  const otherEntries = entries.slice(1)

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className={cn(
          'flex h-32 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-center text-sm transition-colors',
          error
            ? 'border-destructive/40 bg-destructive/5 hover:bg-destructive/10 text-destructive'
            : 'border-border bg-muted/50 hover:bg-muted text-muted-foreground'
        )}
      >
        <input {...getInputProps()} />
        <p>
          {isDragActive
            ? t('project_create_edit.drop_files')
            : t('project_create_edit.drag_files')}
        </p>
      </div>
      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      {entries.length === 0 && emptyHint && (
        <p className="text-muted-foreground text-sm">
          {emptyHint}
        </p>
      )}

      {entries.length > 0 && (
        <FieldSet className="gap-2">
          <FieldLegend
            variant="label"
            className="text-muted-foreground mb-0"
          >
            {photoLabel}
          </FieldLegend>
          <File
            file={getFile(entries[0])}
            id={0}
            removeFile={onRemove}
          />

          {otherEntries.length > 0 && (
            <>
              <p className="text-muted-foreground text-sm">
                {t('project_create_edit.multiple_photos')}{' '}
                <button
                  type="button"
                  onClick={() =>
                    setSelectMode((value) => !value)
                  }
                  className="text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark font-semibold"
                >
                  {t(
                    'project_create_edit.set_display_photo'
                  )}
                </button>
                .
              </p>
              <FieldLegend
                variant="label"
                className="text-muted-foreground mb-0 mt-1"
              >
                {t('project_create_edit.other_photo')}
              </FieldLegend>
              <div className="flex flex-col gap-2">
                {otherEntries.map((entry, offset) => {
                  const index = offset + 1
                  return (
                    <div
                      key={getKey(entry, index)}
                      className="flex items-center gap-2"
                    >
                      {selectMode && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={(e) =>
                            onSetPhoto(e, index)
                          }
                        >
                          {t(
                            'project_create_edit.select_photo'
                          )}
                        </Button>
                      )}
                      <div className="min-w-0 flex-1">
                        <File
                          file={getFile(entry)}
                          id={index}
                          removeFile={onRemove}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </FieldSet>
      )}
    </div>
  )
}
