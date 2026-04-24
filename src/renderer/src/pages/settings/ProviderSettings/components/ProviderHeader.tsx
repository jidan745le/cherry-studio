import { Switch } from '@cherrystudio/ui'
import { ProviderAvatar } from '@renderer/components/ProviderAvatar'
import { useTranslation } from 'react-i18next'

import { useProviderMeta } from '../hooks/providerSetting/useProviderMeta'

interface ProviderHeaderProps {
  provider: {
    id: string
    name: string
    isEnabled: boolean
  }
  onEnabledChange: (enabled: boolean) => void
}

export default function ProviderHeader({ provider, onEnabledChange }: ProviderHeaderProps) {
  const { t } = useTranslation()
  const meta = useProviderMeta(provider.id)

  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <ProviderAvatar provider={provider} size={32} className="shrink-0 rounded-xl" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-semibold text-(--color-foreground) text-[16px] leading-[1.25]">
              {meta.fancyProviderName}
            </h1>
            {meta.docsWebsite && (
              <a
                href={meta.docsWebsite}
                target="_blank"
                rel="noreferrer"
                className="text-(--color-primary) text-[13px] transition-colors hover:opacity-80">
                {t('common.docs')}
              </a>
            )}
          </div>
          <p className="mt-0.5 text-(--color-muted-foreground) text-[13px] leading-[1.35]">{provider.id}</p>
        </div>
      </div>
      <Switch checked={provider.isEnabled} onCheckedChange={onEnabledChange} />
    </div>
  )
}
