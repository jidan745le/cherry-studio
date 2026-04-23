import { HelpTooltip, InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, Tooltip } from '@cherrystudio/ui'
import CherryINSettings from '@renderer/pages/settings/ProviderSettings/CherryINSettings'
import { Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { UseProviderSettingResult } from '../hooks/useProviderSetting'
import ProviderField from './ProviderField'
import ProviderSection from './ProviderSection'
import { fieldClasses } from './ProviderSettingsPrimitives'

function AzureApiVersionField({
  className,
  apiVersion,
  onApiVersionChange,
  onApiVersionCommit
}: {
  className?: string
  apiVersion: string
  onApiVersionChange: (value: string) => void
  onApiVersionCommit: () => void
}) {
  const { t } = useTranslation()
  return (
    <ProviderField
      className={className}
      title={t('settings.provider.api_version')}
      help={
        <div className="pt-1 text-[12px] text-foreground/55 leading-[1.35]">
          {t('settings.provider.azure.apiversion.tip')}
        </div>
      }>
      <InputGroup className={fieldClasses.inputGroupBlock}>
        <InputGroupInput
          className={fieldClasses.input}
          value={apiVersion}
          placeholder="2024-xx-xx-preview"
          onChange={(event) => onApiVersionChange(event.target.value)}
          onBlur={onApiVersionCommit}
        />
      </InputGroup>
    </ProviderField>
  )
}

interface ConnectionSectionProps {
  viewModel: UseProviderSettingResult
  onOpenCustomHeaders: () => void
}

export default function ConnectionSection({ viewModel, onOpenCustomHeaders }: ConnectionSectionProps) {
  const { t } = useTranslation()
  const { provider, drafts, computed, actions } = viewModel

  if (!provider || !computed.isConnectionFieldVisible) {
    return computed.isAzureOpenAI ? (
      <ProviderSection>
        <AzureApiVersionField
          apiVersion={drafts.apiVersion}
          onApiVersionChange={drafts.setApiVersion}
          onApiVersionCommit={actions.commitApiVersion}
        />
      </ProviderSection>
    ) : null
  }

  return (
    <ProviderSection>
      <ProviderField
        title={
          <div className="flex items-center gap-1">
            <span>
              {drafts.activeHostField === 'anthropicApiHost'
                ? t('settings.provider.anthropic_api_host')
                : `${t('settings.provider.api_host')} (Endpoint URL)`}
            </span>
            <HelpTooltip title={t('settings.provider.api.url.tip')} />
          </div>
        }
        help={
          drafts.activeHostField === 'apiHost' ? (
            <div className="space-y-1 pt-1">
              {provider.id === 'vertexai' && (
                <div className="text-[12px] text-foreground/55 leading-[1.35]">
                  {t('settings.provider.vertex_ai.api_host_help')}
                </div>
              )}
              <div className="break-all text-[12px] text-foreground/55 leading-[1.35]">
                {t('settings.provider.api_host_preview', { url: computed.hostPreview })}
              </div>
            </div>
          ) : (
            <div className="break-all pt-1 text-[12px] text-foreground/55 leading-[1.35]">
              {t('settings.provider.anthropic_api_host_preview', {
                url: computed.anthropicHostPreview || '—'
              })}
            </div>
          )
        }>
        {drafts.activeHostField === 'apiHost' ? (
          computed.isCherryIN && computed.isChineseUser ? (
            <CherryINSettings providerId={provider.id} />
          ) : (
            <div className={fieldClasses.inputRow}>
              <InputGroup className={fieldClasses.inputGroup}>
                <InputGroupInput
                  className={fieldClasses.input}
                  value={drafts.apiHost}
                  placeholder={t('settings.provider.api_host')}
                  onChange={(event) => drafts.setApiHost(event.target.value)}
                  onBlur={actions.commitApiHost}
                />
                {computed.isApiHostResettable && (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      variant="destructive"
                      size="sm"
                      className="rounded-lg text-[12px]"
                      onClick={actions.resetApiHost}>
                      {t('settings.provider.api.url.reset')}
                    </InputGroupButton>
                  </InputGroupAddon>
                )}
              </InputGroup>
              <Tooltip content={t('settings.provider.copilot.custom_headers')}>
                <span className={fieldClasses.inputRowEndSlot}>
                  <button type="button" className={fieldClasses.iconButton} onClick={onOpenCustomHeaders}>
                    <Settings2 size={12} />
                  </button>
                </span>
              </Tooltip>
            </div>
          )
        ) : (
          <div className={fieldClasses.inputRow}>
            <InputGroup className={fieldClasses.inputGroup}>
              <InputGroupInput
                className={fieldClasses.input}
                value={drafts.anthropicApiHost}
                placeholder={t('settings.provider.anthropic_api_host')}
                onChange={(event) => drafts.setAnthropicApiHost(event.target.value)}
                onBlur={actions.commitAnthropicApiHost}
              />
            </InputGroup>
            <span className={fieldClasses.inputRowEndSlot} aria-hidden />
          </div>
        )}
      </ProviderField>
      {computed.isAzureOpenAI && (
        <AzureApiVersionField
          className="mt-4"
          apiVersion={drafts.apiVersion}
          onApiVersionChange={drafts.setApiVersion}
          onApiVersionCommit={actions.commitApiVersion}
        />
      )}
    </ProviderSection>
  )
}
