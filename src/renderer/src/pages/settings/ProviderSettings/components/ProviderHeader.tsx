import { Switch } from '@cherrystudio/ui'
import { ProviderAvatar } from '@renderer/components/ProviderAvatar'
import { useTranslation } from 'react-i18next'

interface ProviderHeaderProps {
  provider: {
    id: string
    name: string
    isEnabled: boolean
  }
  name: string
  officialWebsite?: string
  docsWebsite?: string
  showApiOptionsButton: boolean
  onOpenApiOptions: () => void
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
}

export default function ProviderHeader({ provider, name, docsWebsite, enabled, onEnabledChange }: ProviderHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <ProviderAvatar provider={provider} size={32} className="shrink-0 rounded-xl" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-semibold text-[16px] text-(--color-foreground) leading-[1.25]">{name}</h1>
            {docsWebsite && (
              <a
                href={docsWebsite}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] text-(--color-primary) transition-colors hover:opacity-80">
                {t('common.docs')}
              </a>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-(--color-muted-foreground) leading-[1.35]">{provider.id}</p>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={onEnabledChange} />
    </div>
  )
}
