import { InputGroup, InputGroupAddon, InputGroupInput, Tooltip, WarnTooltip } from '@cherrystudio/ui'
import { Copy, Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { UseProviderSettingResult } from '../hooks/useProviderSetting'
import ProviderField from './ProviderField'
import ProviderSection from './ProviderSection'
import { fieldClasses } from './ProviderSettingsPrimitives'

interface AuthenticationSectionProps {
  viewModel: UseProviderSettingResult
}

export default function AuthenticationSection({ viewModel }: AuthenticationSectionProps) {
  const { t } = useTranslation()
  const { provider, drafts, computed, status, actions } = viewModel
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    setShowApiKey(false)
  }, [provider?.id])

  if (!provider || !computed.isApiKeyFieldVisible) {
    return null
  }

  return (
    <ProviderSection>
      <ProviderField
        className="space-y-2.5"
        title={t('settings.provider.api_key.label')}
        action={
          computed.apiKeyWebsite && !computed.isDmxapi ? (
            <a
              href={computed.apiKeyWebsite}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-(--color-primary) text-[12px] leading-[1.35] hover:underline">
              {t('settings.provider.get_api_key')}
            </a>
          ) : undefined
        }>
        <div className={fieldClasses.inputRow}>
          <InputGroup className={fieldClasses.inputGroup}>
            <InputGroupInput
              type={showApiKey ? 'text' : 'password'}
              className={fieldClasses.input}
              value={drafts.localApiKey}
              placeholder={t('settings.provider.api_key.label')}
              onChange={(event) => drafts.setLocalApiKey(event.target.value)}
              autoFocus={provider.isEnabled && !computed.providerApiKey}
              disabled={provider.id === 'copilot' || !computed.isApiKeyInlineEditable}
            />
            {provider.id !== 'copilot' && (
              <InputGroupAddon align="inline-end">
                <Tooltip
                  content={
                    showApiKey ? t('settings.provider.api_key.hide_key') : t('settings.provider.api_key.show_key')
                  }>
                  <button
                    type="button"
                    className={fieldClasses.apiKeyVisibilityToggle}
                    onClick={() => setShowApiKey((v) => !v)}>
                    {showApiKey ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </Tooltip>
              </InputGroupAddon>
            )}
            {status.apiKeyConnectivity.status === 'failed' && !status.apiKeyConnectivity.checking && (
              <InputGroupAddon align="inline-end">
                <WarnTooltip
                  content={status.apiKeyConnectivity.error?.message || t('settings.models.check.failed')}
                  onClick={actions.showApiKeyError}
                />
              </InputGroupAddon>
            )}
          </InputGroup>
          <Tooltip content={t('settings.provider.api_key.copy')}>
            <span className="inline-flex">
              <button
                type="button"
                disabled={provider.id === 'copilot' || !drafts.localApiKey}
                className={fieldClasses.iconButton}
                onClick={() => {
                  if (!drafts.localApiKey) {
                    return
                  }
                  void navigator.clipboard.writeText(drafts.localApiKey)
                }}>
                <Copy size={12} />
              </button>
            </span>
          </Tooltip>
        </div>
      </ProviderField>
    </ProviderSection>
  )
}
