import { InputGroup, InputGroupAddon, InputGroupInput, Tooltip, WarnTooltip } from '@cherrystudio/ui'
import type { ApiKeyConnectivity } from '@renderer/types/healthCheck'
import type { Provider } from '@shared/data/types/provider'
import { Copy, Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ProviderField from './ProviderField'
import ProviderSection from './ProviderSection'
import { fieldClasses } from './ProviderSettingsPrimitives'

interface ApiKeyProps {
  provider: Provider
  inputApiKey: string
  setInputApiKey: (value: string) => void
  serverApiKey: string
  isApiKeyFieldVisible: boolean
  apiKeyWebsite?: string
  isDmxapi: boolean
  apiKeyConnectivity: ApiKeyConnectivity
  onShowApiKeyError: () => void
}

export default function ApiKey({
  provider,
  inputApiKey,
  setInputApiKey,
  serverApiKey,
  isApiKeyFieldVisible,
  apiKeyWebsite,
  isDmxapi,
  apiKeyConnectivity,
  onShowApiKeyError
}: ApiKeyProps) {
  const { t } = useTranslation()
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    setShowApiKey(false)
  }, [provider?.id])

  if (!isApiKeyFieldVisible) {
    return null
  }

  return (
    <ProviderSection>
      <ProviderField
        className="space-y-2.5"
        title={t('settings.provider.api_key.label')}
        action={
          apiKeyWebsite && !isDmxapi ? (
            <a
              href={apiKeyWebsite}
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
              value={inputApiKey}
              placeholder={t('settings.provider.api_key.label')}
              onChange={(event) => setInputApiKey(event.target.value)}
              autoFocus={provider.isEnabled && !serverApiKey}
              disabled={provider.id === 'copilot'}
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
            {apiKeyConnectivity.status === 'failed' && !apiKeyConnectivity.checking && (
              <InputGroupAddon align="inline-end">
                <WarnTooltip
                  content={apiKeyConnectivity.error?.message || t('settings.models.check.failed')}
                  onClick={onShowApiKeyError}
                />
              </InputGroupAddon>
            )}
          </InputGroup>
          <Tooltip content={t('settings.provider.api_key.copy')}>
            <span className="inline-flex">
              <button
                type="button"
                disabled={provider.id === 'copilot' || !inputApiKey}
                className={fieldClasses.iconButton}
                onClick={() => {
                  if (!inputApiKey) {
                    return
                  }
                  void navigator.clipboard.writeText(inputApiKey)
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
