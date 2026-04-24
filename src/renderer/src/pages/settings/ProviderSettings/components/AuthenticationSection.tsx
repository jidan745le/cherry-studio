import { ApiKeyListPopup } from '@renderer/components/Popups/ApiKeyListPopup'
import { useProvider } from '@renderer/hooks/useProviders'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useProviderApiKey } from '../hooks/providerSetting/useProviderApiKey'
import { useProviderConnectionCheck } from '../hooks/providerSetting/useProviderConnectionCheck'
import { useProviderEndpoints } from '../hooks/providerSetting/useProviderEndpoints'
import { useProviderMeta } from '../hooks/providerSetting/useProviderMeta'
import ApiActions from './ApiActions'
import ApiHost from './ApiHost'
import ApiKey from './ApiKey'
import ProviderBlockHeading from './ProviderBlockHeading'
import ProviderSpecificSettings from './ProviderSpecificSettings'

interface AuthenticationSectionProps {
  providerId: string
}

/**
 * AuthenticationSection is the nearest real shared owner for connection/auth drafts:
 * it owns the small amount of section-local wiring needed to coordinate API key drafts,
 * endpoint drafts, and check/open actions without leaking them back to the page shell.
 */
export default function AuthenticationSection({ providerId }: AuthenticationSectionProps) {
  const { t } = useTranslation()
  const { provider } = useProvider(providerId)
  const meta = useProviderMeta(providerId)
  const apiKey = useProviderApiKey(providerId)
  const endpoints = useProviderEndpoints(provider)

  const openApiKeyList = useCallback(async () => {
    if (!provider) {
      return
    }

    await apiKey.commitInputApiKeyNow()

    await ApiKeyListPopup.show({
      providerId: provider.id,
      title: `${meta.fancyProviderName} ${t('settings.provider.api.key.list.title')}`,
      providerType: 'llm'
    })
  }, [apiKey, meta.fancyProviderName, provider, t])

  const connectionCheck = useProviderConnectionCheck(providerId, {
    inputApiKey: apiKey.inputApiKey,
    apiHost: endpoints.apiHost,
    openApiKeyList
  })

  if (!provider) {
    return null
  }

  return (
    <section className="shrink-0 space-y-2.5" aria-label="provider-connection-sections">
      <ProviderBlockHeading>连接认证 (Authentication)</ProviderBlockHeading>
      <ProviderSpecificSettings providerId={provider.id} placement="beforeAuth" />
      <ApiKey
        provider={provider}
        inputApiKey={apiKey.inputApiKey}
        setInputApiKey={apiKey.setInputApiKey}
        serverApiKey={apiKey.serverApiKey}
        isApiKeyFieldVisible={meta.isApiKeyFieldVisible}
        apiKeyWebsite={meta.apiKeyWebsite}
        isDmxapi={meta.isDmxapi}
        apiKeyConnectivity={connectionCheck.apiKeyConnectivity}
        onShowApiKeyError={connectionCheck.showApiKeyError}
      />
      <ApiHost
        providerId={providerId}
        primaryEndpoint={endpoints.primaryEndpoint}
        apiHost={endpoints.apiHost}
        setApiHost={endpoints.setApiHost}
        anthropicApiHost={endpoints.anthropicApiHost}
        setAnthropicApiHost={endpoints.setAnthropicApiHost}
        apiVersion={endpoints.apiVersion}
        setApiVersion={endpoints.setApiVersion}
      />
      <ApiActions
        showApiKeyListButton={meta.isApiKeyFieldVisible && provider.id !== 'copilot'}
        onCheckConnection={() => void connectionCheck.checkApi()}
        onOpenApiKeyList={() => void openApiKeyList()}
      />
      <ProviderSpecificSettings providerId={provider.id} placement="afterAuth" />
    </section>
  )
}
