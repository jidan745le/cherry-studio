import { HelpTooltip, InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, Tooltip } from '@cherrystudio/ui'
import { useProvider, useProviderMutations } from '@renderer/hooks/useProviders'
import CherryINSettings from '@renderer/pages/settings/ProviderSettings/CherryINSettings'
import CustomHeaderPopup from '@renderer/pages/settings/ProviderSettings/CustomHeaderPopup'
import { getProviderHostTopology } from '@renderer/utils/providerTopology'
import { ENDPOINT_TYPE, type EndpointType } from '@shared/data/types/model'
import { Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useProviderEndpointActions } from '../hooks/providerSetting/useProviderEndpointActions'
import { useProviderHostPreview } from '../hooks/providerSetting/useProviderHostPreview'
import { useProviderMeta } from '../hooks/providerSetting/useProviderMeta'
import { useProviderModelSync } from '../hooks/useProviderModelSync'
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

interface ApiHostProps {
  providerId: string
  primaryEndpoint: EndpointType
  apiHost: string
  setApiHost: (value: string) => void
  anthropicApiHost: string
  setAnthropicApiHost: (value: string) => void
  apiVersion: string
  setApiVersion: (value: string) => void
}

export default function ApiHost({
  providerId,
  primaryEndpoint,
  apiHost,
  setApiHost,
  anthropicApiHost,
  setAnthropicApiHost,
  apiVersion,
  setApiVersion
}: ApiHostProps) {
  const { t } = useTranslation()
  const { provider } = useProvider(providerId)
  const { updateProvider } = useProviderMutations(providerId)
  const meta = useProviderMeta(providerId)
  const { syncProviderModels } = useProviderModelSync(providerId)
  const topology = getProviderHostTopology(provider)
  const isAnthropicPrimaryEndpoint = primaryEndpoint === ENDPOINT_TYPE.ANTHROPIC_MESSAGES
  const hostPreview = useProviderHostPreview({
    provider,
    apiHost,
    anthropicApiHost
  })
  const endpointActions = useProviderEndpointActions({
    provider,
    primaryEndpoint: topology.primaryEndpoint,
    apiHost,
    setApiHost,
    providerApiHost: topology.primaryBaseUrl,
    anthropicApiHost,
    setAnthropicApiHost,
    apiVersion,
    patchProvider: updateProvider,
    syncProviderModels
  })

  if (!provider) {
    return null
  }

  if (!meta.isConnectionFieldVisible) {
    return meta.isAzureOpenAI ? (
      <ProviderSection>
        <AzureApiVersionField
          apiVersion={apiVersion}
          onApiVersionChange={setApiVersion}
          onApiVersionCommit={endpointActions.commitApiVersion}
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
              {isAnthropicPrimaryEndpoint
                ? t('settings.provider.anthropic_api_host')
                : `${t('settings.provider.api_host')} (Endpoint URL)`}
            </span>
            <HelpTooltip title={t('settings.provider.api.url.tip')} />
          </div>
        }
        help={
          !isAnthropicPrimaryEndpoint ? (
            <div className="space-y-1 pt-1">
              {provider.id === 'vertexai' && (
                <div className="text-[12px] text-foreground/55 leading-[1.35]">
                  {t('settings.provider.vertex_ai.api_host_help')}
                </div>
              )}
              <div className="break-all text-[12px] text-foreground/55 leading-[1.35]">
                {t('settings.provider.api_host_preview', { url: hostPreview.hostPreview })}
              </div>
            </div>
          ) : (
            <div className="break-all pt-1 text-[12px] text-foreground/55 leading-[1.35]">
              {t('settings.provider.anthropic_api_host_preview', {
                url: hostPreview.anthropicHostPreview || '—'
              })}
            </div>
          )
        }>
        {!isAnthropicPrimaryEndpoint ? (
          meta.isCherryIN && meta.isChineseUser ? (
            <CherryINSettings providerId={provider.id} />
          ) : (
            <div className={fieldClasses.inputRow}>
              <InputGroup className={fieldClasses.inputGroup}>
                <InputGroupInput
                  className={fieldClasses.input}
                  value={apiHost}
                  placeholder={t('settings.provider.api_host')}
                  onChange={(event) => setApiHost(event.target.value)}
                  onBlur={endpointActions.commitApiHost}
                />
                {hostPreview.isApiHostResettable && (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      variant="destructive"
                      size="sm"
                      className="rounded-lg text-[12px]"
                      onClick={endpointActions.resetApiHost}>
                      {t('settings.provider.api.url.reset')}
                    </InputGroupButton>
                  </InputGroupAddon>
                )}
              </InputGroup>
              <Tooltip content={t('settings.provider.copilot.custom_headers')}>
                <span className={fieldClasses.inputRowEndSlot}>
                  <button
                    type="button"
                    className={fieldClasses.iconButton}
                    onClick={() => void CustomHeaderPopup.show({ providerId })}>
                    <Settings2 size={12} />
                  </button>
                </span>
              </Tooltip>
            </div>
          )
        ) : (
          <InputGroup className={fieldClasses.inputGroupBlock}>
            <InputGroupInput
              className={fieldClasses.input}
              value={anthropicApiHost}
              placeholder={t('settings.provider.anthropic_api_host')}
              onChange={(event) => setAnthropicApiHost(event.target.value)}
              onBlur={endpointActions.commitAnthropicApiHost}
            />
          </InputGroup>
        )}
      </ProviderField>
      {meta.isAzureOpenAI && (
        <AzureApiVersionField
          className="mt-4"
          apiVersion={apiVersion}
          onApiVersionChange={setApiVersion}
          onApiVersionCommit={endpointActions.commitApiVersion}
        />
      )}
    </ProviderSection>
  )
}
