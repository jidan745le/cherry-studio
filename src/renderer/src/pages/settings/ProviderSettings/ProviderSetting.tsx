import { Button } from '@cherrystudio/ui'
import ApiOptionsSettingsPopup from '@renderer/pages/settings/ProviderSettings/ApiOptionsSettings/ApiOptionsSettingsPopup'
import CustomHeaderPopup from '@renderer/pages/settings/ProviderSettings/CustomHeaderPopup'
import { Activity, KeyRound, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import AuthenticationSection from './components/AuthenticationSection'
import ConnectionSection from './components/ConnectionSection'
import ProviderHeader from './components/ProviderHeader'
import { ProviderSettingsContainer } from './components/ProviderSettingsPrimitives'
import ProviderSpecificSettings from './components/ProviderSpecificSettings'
import { useProviderSetting } from './hooks/useProviderSetting'
import { ModelList } from './ModelList'

interface ProviderSettingProps {
  providerId: string
  isOnboarding?: boolean
}

export default function ProviderSetting({ providerId, isOnboarding = false }: ProviderSettingProps) {
  const { t } = useTranslation()
  const viewModel = useProviderSetting(providerId, isOnboarding)
  const { provider, theme, derived, drafts, actions } = viewModel

  if (!provider) {
    return null
  }

  return (
    <ProviderSettingsContainer theme={theme}>
      <div className="flex h-full w-full min-h-0 flex-col">
        <div
          data-testid="provider-detail-shell"
          className="flex min-h-0 flex-1 flex-col overflow-hidden bg-(--color-background)">
          <div className="shrink-0 px-8 pt-8 pb-6">
            <ProviderHeader
              provider={provider}
              name={derived.fancyProviderName}
              officialWebsite={derived.officialWebsite}
              docsWebsite={derived.docsWebsite}
              showApiOptionsButton={derived.showApiOptionsButton}
              onOpenApiOptions={() => ApiOptionsSettingsPopup.show({ providerId: provider.id })}
              enabled={provider.isEnabled}
              onEnabledChange={(enabled) => void actions.toggleProviderEnabled(enabled)}
            />
          </div>
          <section
            data-testid="provider-endpoint-tabs"
            className="flex shrink-0 items-center justify-between gap-3 border-(--color-border) border-y px-8">
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {derived.hostSelectorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => drafts.setActiveHostField(option.value)}
                  className={
                    drafts.activeHostField === option.value
                      ? 'relative rounded-3xs px-3 py-2.5 font-medium text-(--color-foreground) text-sm'
                      : 'rounded-3xs px-3 py-2.5 text-(--color-muted-foreground) text-sm transition hover:bg-accent/40 hover:text-(--color-foreground)'
                  }>
                  {option.label}
                  {drafts.activeHostField === option.value && (
                    <span className="absolute right-2 bottom-0 left-2 h-[2px] rounded-full bg-(--color-primary)" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="h-auto rounded-3xs border border-border/40 bg-transparent px-3 py-[6px] text-[11px] text-muted-foreground/70 shadow-none hover:bg-accent/40 hover:text-foreground">
                <Plus size={14} />
                {t('button.add')}
              </Button>
            </div>
          </section>
          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-8">
              <section className="space-y-4" aria-label="provider-connection-sections">
                <div>
                  <p className="mb-2.5 font-semibold text-(--color-foreground) text-base">连接认证 (Authentication)</p>
                </div>
                <ProviderSpecificSettings viewModel={viewModel} placement="before" />
                <AuthenticationSection viewModel={viewModel} />
                <ConnectionSection
                  viewModel={viewModel}
                  onOpenCustomHeaders={() => void CustomHeaderPopup.show({ providerId })}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-auto rounded-3xs px-3 py-[6px] text-sm shadow-none"
                    onClick={() => void actions.checkApi()}>
                    <Activity size={14} />
                    {t('settings.provider.check')}
                  </Button>
                  {derived.isApiKeyFieldVisible && provider.id !== 'copilot' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto rounded-3xs border-border/40 bg-transparent px-3 py-[6px] text-sm text-muted-foreground/70 shadow-none hover:bg-accent/40 hover:text-foreground"
                      onClick={() => void actions.openApiKeyList()}>
                      <KeyRound size={14} />
                      {t('settings.provider.api.key.list.title')}
                    </Button>
                  )}
                </div>
                <ProviderSpecificSettings viewModel={viewModel} placement="after" />
              </section>
              <ModelList providerId={provider.id} />
            </div>
          </div>
        </div>
      </div>
    </ProviderSettingsContainer>
  )
}
