import { Button } from '@cherrystudio/ui'
import ApiOptionsSettingsPopup from '@renderer/pages/settings/ProviderSettings/ApiOptionsSettings/ApiOptionsSettingsPopup'
import CustomHeaderPopup from '@renderer/pages/settings/ProviderSettings/CustomHeaderPopup'
import { cn } from '@renderer/utils'
import { Activity, KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import AuthenticationSection from './components/AuthenticationSection'
import ConnectionSection from './components/ConnectionSection'
import ProviderHeader from './components/ProviderHeader'
import {
  actionClasses,
  ProviderSettingsContainer,
  sectionHeadingClasses
} from './components/ProviderSettingsPrimitives'
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
  const { provider, theme, computed, drafts, actions } = viewModel

  if (!provider) {
    return null
  }

  return (
    <ProviderSettingsContainer theme={theme}>
      <div className="flex h-full min-h-0 w-full flex-col">
        <div
          data-testid="provider-detail-shell"
          className="provider-settings-default-scope flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 px-5 py-3.5">
            <ProviderHeader
              provider={provider}
              name={computed.fancyProviderName}
              officialWebsite={computed.officialWebsite}
              docsWebsite={computed.docsWebsite}
              showApiOptionsButton={computed.showApiOptionsButton}
              onOpenApiOptions={() => ApiOptionsSettingsPopup.show({ providerId: provider.id })}
              enabled={provider.isEnabled}
              onEnabledChange={(enabled) => void actions.toggleProviderEnabled(enabled)}
            />
          </div>
          <section
            data-testid="provider-endpoint-tabs"
            className="flex shrink-0 items-center gap-0.5 border-foreground/[0.05] border-b px-5">
            <div className="flex min-w-0 flex-wrap items-center gap-0.5">
              {computed.hostSelectorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => drafts.setActiveHostField(option.value)}
                  className={
                    drafts.activeHostField === option.value
                      ? 'relative px-2.5 py-[7px] text-(--color-primary) text-[13px]'
                      : 'px-2.5 py-[7px] text-[13px] text-foreground/65 transition hover:text-foreground/85'
                  }>
                  {option.label}
                  {drafts.activeHostField === option.value && (
                    <span className="absolute right-1 bottom-0 left-1 h-[1.5px] rounded-full bg-(--color-primary)" />
                  )}
                </button>
              ))}
            </div>
          </section>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/20 [&::-webkit-scrollbar]:w-[3px]">
            <div className="space-y-4">
              <section className="space-y-2.5" aria-label="provider-connection-sections">
                <div>
                  <p className={cn('mb-2.5', sectionHeadingClasses)}>连接认证 (Authentication)</p>
                </div>
                <ProviderSpecificSettings viewModel={viewModel} placement="before" />
                <AuthenticationSection viewModel={viewModel} />
                <ConnectionSection
                  viewModel={viewModel}
                  onOpenCustomHeaders={() => void CustomHeaderPopup.show({ providerId })}
                />
                <div className={actionClasses.row}>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(actionClasses.btnBase, actionClasses.btnNeutral)}
                    onClick={() => void actions.checkApi()}>
                    <Activity className={actionClasses.icon} />
                    {t('settings.provider.check')}
                  </Button>
                  {computed.isApiKeyFieldVisible && provider.id !== 'copilot' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(actionClasses.btnBase, actionClasses.btnNeutral)}
                      onClick={() => void actions.openApiKeyList()}>
                      <KeyRound className={actionClasses.icon} />
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
