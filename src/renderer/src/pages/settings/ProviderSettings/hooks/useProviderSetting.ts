import { useReorder } from '@data/hooks/useReorder'
import { showErrorDetailPopup } from '@renderer/components/ErrorDetailModal'
import { ApiKeyListPopup } from '@renderer/components/Popups/ApiKeyListPopup'
import { isRerankModel } from '@renderer/config/models/v2'
import { PROVIDER_URLS } from '@renderer/config/providers'
import { useTheme } from '@renderer/context/ThemeProvider'
import { useModels } from '@renderer/hooks/useModels'
import { useProvider, useProviderApiKeys, useProviderMutations } from '@renderer/hooks/useProviders'
import { useTimer } from '@renderer/hooks/useTimer'
import SelectProviderModelPopup from '@renderer/pages/settings/ProviderSettings/SelectProviderModelPopup'
import { useAppDispatch } from '@renderer/store'
import { isSystemProviderId, SystemProviderIds } from '@renderer/types'
import type { ApiKeyConnectivity } from '@renderer/types/healthCheck'
import { HealthStatus } from '@renderer/types/healthCheck'
import { formatApiHost, formatApiKeys, validateApiHost } from '@renderer/utils'
import { formatOllamaApiHost, formatVertexApiHost, isWithTrailingSharp } from '@renderer/utils/api'
import { serializeHealthCheckError } from '@renderer/utils/error'
import {
  getFancyProviderName,
  isAnthropicProvider,
  isAnthropicSupportedProvider,
  isAzureOpenAIProvider,
  isCherryAIProvider,
  isGeminiProvider,
  isNewApiProvider,
  isOllamaProvider,
  isOpenAICompatibleProvider,
  isOpenAIResponsesProvider,
  isPerplexityProvider,
  isSystemProvider,
  isVertexProvider
} from '@renderer/utils/provider.v2'
import { toV1ProviderShim } from '@renderer/utils/v1ProviderShim'
import type { ThemeMode } from '@shared/data/preference/preferenceTypes'
import type { Model } from '@shared/data/types/model'
import { ENDPOINT_TYPE } from '@shared/data/types/model'
import type { ApiKeyEntry, Provider } from '@shared/data/types/provider'
import { debounce, isEmpty } from 'lodash'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { providerCheckApiAdapter } from '../adapters/providerCheckApiAdapter'
import { applyProviderApiKeySideEffects } from '../adapters/providerSettingsSideEffects'

const ANTHROPIC_COMPATIBLE_PROVIDER_IDS = [
  SystemProviderIds.deepseek,
  SystemProviderIds.moonshot,
  SystemProviderIds.zhipu,
  SystemProviderIds.dashscope,
  SystemProviderIds.modelscope,
  SystemProviderIds.aihubmix,
  SystemProviderIds.grok,
  SystemProviderIds.cherryin,
  SystemProviderIds.longcat,
  SystemProviderIds.minimax,
  SystemProviderIds.silicon,
  SystemProviderIds.qiniu,
  SystemProviderIds.dmxapi,
  SystemProviderIds.mimo,
  SystemProviderIds.openrouter,
  SystemProviderIds.tokenflux,
  SystemProviderIds.ollama
] as const

type AnthropicCompatibleProviderId = (typeof ANTHROPIC_COMPATIBLE_PROVIDER_IDS)[number]
type HostField = 'apiHost' | 'anthropicApiHost'

const ANTHROPIC_COMPATIBLE_PROVIDER_ID_SET = new Set<string>(ANTHROPIC_COMPATIBLE_PROVIDER_IDS)

const isAnthropicCompatibleProviderId = (id: string): id is AnthropicCompatibleProviderId => {
  return ANTHROPIC_COMPATIBLE_PROVIDER_ID_SET.has(id)
}

export interface UseProviderSettingResult {
  provider?: Provider
  models: Model[]
  apiKeys: ApiKeyEntry[]
  theme: ThemeMode
  drafts: {
    apiHost: string
    setApiHost: (value: string) => void
    anthropicApiHost: string
    setAnthropicApiHost: (value: string) => void
    apiVersion: string
    setApiVersion: (value: string) => void
    localApiKey: string
    setLocalApiKey: (value: string) => void
    activeHostField: HostField
    setActiveHostField: (value: HostField) => void
  }
  computed: {
    providerApiKey: string
    fancyProviderName: string
    officialWebsite?: string
    apiKeyWebsite?: string
    docsWebsite?: string
    modelsWebsite?: string
    configuredApiHost?: string
    isApiKeyConnectable: boolean
    isApiHostResettable: boolean
    isApiKeyFieldVisible: boolean
    isConnectionFieldVisible: boolean
    canConfigureAnthropicHost: boolean
    hostSelectorOptions: Array<{ value: HostField; label: string }>
    hostSelectorTooltip: string
    hostPreview: string
    anthropicHostPreview: string
    hideApiInput: boolean
    hideApiKeyInput: boolean
    isAzureOpenAI: boolean
    isDmxapi: boolean
    isCherryIN: boolean
    isChineseUser: boolean
    isAnthropicOAuth: boolean
    showApiOptionsButton: boolean
  }
  status: {
    isLoading: boolean
    apiKeyConnectivity: ApiKeyConnectivity
  }
  actions: {
    patchProvider: (updates: Record<string, unknown>) => Promise<void>
    toggleProviderEnabled: (enabled: boolean) => Promise<void>
    openApiKeyList: () => Promise<void>
    checkApi: () => Promise<void>
    resetApiHost: () => void
    commitApiHost: () => void
    commitAnthropicApiHost: () => void
    commitApiVersion: () => void
    showApiKeyError: () => void
  }
}

export function useProviderSetting(providerId: string, isOnboarding = false): UseProviderSettingResult {
  const { provider, isLoading } = useProvider(providerId)
  const { updateProvider, updateApiKeys } = useProviderMutations(providerId)
  const { move } = useReorder('/providers')
  const { models } = useModels({ providerId })
  const { data: apiKeysData } = useProviderApiKeys(providerId)
  const { setTimeoutTimer } = useTimer()
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const dispatch = useAppDispatch()

  const patchProvider = useCallback(
    async (updates: Record<string, unknown>) => {
      await updateProvider(updates)
    },
    [updateProvider]
  )

  const primaryEndpoint = provider?.defaultChatEndpoint ?? ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS
  const providerApiHost = provider?.endpointConfigs?.[primaryEndpoint]?.baseUrl ?? ''
  const providerAnthropicHost = provider?.endpointConfigs?.[ENDPOINT_TYPE.ANTHROPIC_MESSAGES]?.baseUrl ?? ''
  const providerApiVersion = provider?.settings?.apiVersion ?? ''
  const providerApiKey = apiKeysData?.keys?.map((item) => item.key).join(',') ?? ''

  const [apiHost, setApiHost] = useState(providerApiHost)
  const [anthropicApiHost, setAnthropicApiHost] = useState(providerAnthropicHost)
  const [apiVersion, setApiVersion] = useState(providerApiVersion)
  const [localApiKey, setLocalApiKey] = useState(providerApiKey)
  const [isApiKeyDirty, setIsApiKeyDirty] = useState(false)
  const [activeHostField, setActiveHostField] = useState<HostField>('apiHost')
  const [apiKeyConnectivity, setApiKeyConnectivity] = useState<ApiKeyConnectivity>({
    status: HealthStatus.NOT_CHECKED,
    checking: false
  })

  const isAzureOpenAI = provider ? isAzureOpenAIProvider(provider) : false
  const isDmxapi = provider?.id === 'dmxapi'
  const isCherryIN = provider?.id === 'cherryin'
  const isChineseUser = i18n.language.startsWith('zh')
  const hideApiInput = provider ? provider.id === 'aws-bedrock' : false
  const hideApiKeyInput = provider ? provider.id === 'copilot' || provider.id === 'vertexai' : false

  const providerConfig = provider ? PROVIDER_URLS[provider.id as keyof typeof PROVIDER_URLS] : undefined
  const fancyProviderName = provider ? getFancyProviderName(provider) : ''
  const isAnthropicOAuth = provider?.id === 'anthropic' && provider.authType === 'oauth'
  const showApiOptionsButton = provider ? !isSystemProvider(provider) || isAnthropicSupportedProvider(provider) : false
  const isApiKeyFieldVisible = !hideApiInput && !isAnthropicOAuth && !hideApiKeyInput
  const isConnectionFieldVisible = !hideApiInput && !isAnthropicOAuth && !isDmxapi
  const normalizedLocalApiKey = useMemo(() => formatApiKeys(localApiKey), [localApiKey])

  const updateLocalApiKey = useCallback((value: string) => {
    setIsApiKeyDirty(true)
    setLocalApiKey(value)
  }, [])

  const debouncedUpdateApiKey = useMemo(
    () =>
      debounce(async (value: string, currentProvider: Provider | undefined) => {
        const formatted = formatApiKeys(value)
        const apiKeys = formatted
          .split(',')
          .filter(Boolean)
          .map((key) => ({ id: crypto.randomUUID(), key, isEnabled: true }))

        await updateApiKeys(apiKeys)
        applyProviderApiKeySideEffects({
          providerId: currentProvider?.id ?? providerId,
          apiKey: formatted,
          dispatch
        })

        if (isOnboarding && formatted && !currentProvider?.isEnabled) {
          await patchProvider({ isEnabled: true })
        }
      }, 150),
    [dispatch, isOnboarding, patchProvider, providerId, updateApiKeys]
  )

  useEffect(() => {
    if (!isApiKeyDirty) {
      setLocalApiKey(providerApiKey)
      setApiKeyConnectivity({ status: HealthStatus.NOT_CHECKED, checking: false })
      return
    }

    if (normalizedLocalApiKey === providerApiKey) {
      setIsApiKeyDirty(false)
      setApiKeyConnectivity({ status: HealthStatus.NOT_CHECKED, checking: false })
    }
  }, [isApiKeyDirty, normalizedLocalApiKey, providerApiKey])

  useEffect(() => {
    if (provider && localApiKey !== providerApiKey) {
      void debouncedUpdateApiKey(localApiKey, provider)
    }

    return () => debouncedUpdateApiKey.cancel()
  }, [debouncedUpdateApiKey, localApiKey, provider, providerApiKey])

  useEffect(() => {
    if (!provider || provider.id === 'copilot') {
      return
    }
    setApiHost(providerApiHost)
  }, [provider, providerApiHost])

  useEffect(() => {
    setAnthropicApiHost(providerAnthropicHost)
  }, [providerAnthropicHost])

  useEffect(() => {
    setApiVersion(providerApiVersion)
  }, [providerApiVersion])

  const canConfigureAnthropicHost = useMemo(() => {
    if (!provider || isCherryIN) {
      return false
    }
    if (isNewApiProvider(provider)) {
      return true
    }
    return (
      !isAnthropicProvider(provider) && isSystemProviderId(provider.id) && isAnthropicCompatibleProviderId(provider.id)
    )
  }, [isCherryIN, provider])

  useEffect(() => {
    if (!canConfigureAnthropicHost && activeHostField === 'anthropicApiHost') {
      setActiveHostField('apiHost')
    }
  }, [activeHostField, canConfigureAnthropicHost])

  const hostSelectorOptions = useMemo(() => {
    const options: Array<{ value: HostField; label: string }> = [
      { value: 'apiHost', label: t('settings.provider.api_host') }
    ]

    if (canConfigureAnthropicHost) {
      options.push({
        value: 'anthropicApiHost',
        label: t('settings.provider.anthropic_api_host')
      })
    }

    return options
  }, [canConfigureAnthropicHost, t])

  const hostSelectorTooltip =
    activeHostField === 'anthropicApiHost'
      ? t('settings.provider.anthropic_api_host_tooltip')
      : t('settings.provider.api_host_tooltip')

  const openApiKeyList = useCallback(async () => {
    if (!provider) {
      return
    }

    if (localApiKey !== providerApiKey) {
      const apiKeys = formatApiKeys(localApiKey)
        .split(',')
        .filter(Boolean)
        .map((key) => ({ id: crypto.randomUUID(), key, isEnabled: true }))
      await updateApiKeys(apiKeys)
    }

    await ApiKeyListPopup.show({
      providerId: provider.id,
      title: `${fancyProviderName} ${t('settings.provider.api.key.list.title')}`,
      providerType: 'llm'
    })
  }, [fancyProviderName, localApiKey, provider, providerApiKey, t, updateApiKeys])

  const checkApiAction = useCallback(async () => {
    if (!provider) {
      return
    }

    const formattedKey = formatApiKeys(localApiKey)

    if (formattedKey.includes(',')) {
      await openApiKeyList()
      return
    }

    const modelsToCheck = models.filter((model) => !isRerankModel(model))
    if (isEmpty(modelsToCheck)) {
      window.toast.error({
        timeout: 5000,
        title: t('settings.provider.no_models_for_check')
      })
      return
    }

    const selectedModel = await SelectProviderModelPopup.show({ models })
    if (!selectedModel) {
      window.toast.error(i18n.t('message.error.enter.model'))
      return
    }

    try {
      setApiKeyConnectivity((previous) => ({
        ...previous,
        checking: true,
        status: HealthStatus.NOT_CHECKED
      }))

      await providerCheckApiAdapter({
        provider,
        models,
        selectedModel,
        apiKey: formattedKey,
        apiHost
      })

      window.toast.success({
        timeout: 2000,
        title: i18n.t('message.api.connection.success')
      })

      setApiKeyConnectivity((previous) => ({ ...previous, status: HealthStatus.SUCCESS }))
      setTimeoutTimer(
        'provider-setting-check-api',
        () => setApiKeyConnectivity((previous) => ({ ...previous, status: HealthStatus.NOT_CHECKED })),
        3000
      )
    } catch (error) {
      window.toast.error({
        timeout: 8000,
        title: i18n.t('message.api.connection.failed')
      })

      setApiKeyConnectivity((previous) => ({
        ...previous,
        status: HealthStatus.FAILED,
        error: serializeHealthCheckError(error)
      }))
    } finally {
      setApiKeyConnectivity((previous) => ({ ...previous, checking: false }))
    }
  }, [apiHost, i18n, localApiKey, models, openApiKeyList, provider, setTimeoutTimer, t])

  const moveProviderToTop = useCallback(async () => {
    await move(providerId, { position: 'first' })
  }, [move, providerId])

  const toggleProviderEnabled = useCallback(
    async (enabled: boolean) => {
      if (!provider) {
        return
      }

      await patchProvider({
        isEnabled: enabled,
        endpointConfigs: {
          ...provider.endpointConfigs,
          [primaryEndpoint]: {
            ...provider.endpointConfigs?.[primaryEndpoint],
            baseUrl: apiHost
          }
        }
      })

      if (enabled) {
        await moveProviderToTop()
      }
    },
    [apiHost, moveProviderToTop, patchProvider, primaryEndpoint, provider]
  )

  const commitApiHost = useCallback(() => {
    if (!provider) {
      return
    }

    if (!validateApiHost(apiHost)) {
      setApiHost(providerApiHost)
      window.toast.error(t('settings.provider.api_host_no_valid'))
      return
    }

    if (isVertexProvider(provider) || apiHost.trim()) {
      if (isNewApiProvider(provider)) {
        void patchProvider({
          endpointConfigs: {
            ...provider.endpointConfigs,
            [primaryEndpoint]: { ...provider.endpointConfigs?.[primaryEndpoint], baseUrl: apiHost },
            [ENDPOINT_TYPE.ANTHROPIC_MESSAGES]: {
              ...provider.endpointConfigs?.[ENDPOINT_TYPE.ANTHROPIC_MESSAGES],
              baseUrl: apiHost
            }
          }
        })
        setAnthropicApiHost(apiHost)
        return
      }

      void patchProvider({
        endpointConfigs: {
          ...provider.endpointConfigs,
          [primaryEndpoint]: { ...provider.endpointConfigs?.[primaryEndpoint], baseUrl: apiHost }
        }
      })
      return
    }

    setApiHost(providerApiHost)
  }, [apiHost, patchProvider, primaryEndpoint, provider, providerApiHost, t])

  const commitAnthropicApiHost = useCallback(() => {
    if (!provider) {
      return
    }

    const trimmedHost = anthropicApiHost.trim()
    if (trimmedHost) {
      void patchProvider({
        endpointConfigs: {
          ...provider.endpointConfigs,
          [ENDPOINT_TYPE.ANTHROPIC_MESSAGES]: {
            ...provider.endpointConfigs?.[ENDPOINT_TYPE.ANTHROPIC_MESSAGES],
            baseUrl: trimmedHost
          }
        }
      })
      setAnthropicApiHost(trimmedHost)
      return
    }

    const nextConfigs = { ...provider.endpointConfigs }
    delete nextConfigs[ENDPOINT_TYPE.ANTHROPIC_MESSAGES]
    void patchProvider({ endpointConfigs: nextConfigs })
    setAnthropicApiHost('')
  }, [anthropicApiHost, patchProvider, provider])

  const commitApiVersion = useCallback(() => {
    if (!provider) {
      return
    }

    void patchProvider({
      providerSettings: {
        ...provider.settings,
        apiVersion
      }
    })
  }, [apiVersion, patchProvider, provider])

  const resetApiHost = useCallback(() => {
    if (!provider) {
      return
    }

    setApiHost(providerConfig?.api?.url ?? '')
    void patchProvider({
      endpointConfigs: {
        ...provider.endpointConfigs,
        [primaryEndpoint]: {
          ...provider.endpointConfigs?.[primaryEndpoint],
          baseUrl: providerConfig?.api?.url
        }
      }
    })
  }, [patchProvider, primaryEndpoint, provider, providerConfig?.api?.url])

  const hostPreview = useMemo(() => {
    if (!provider) {
      return ''
    }

    const appendVersion = !isWithTrailingSharp(apiHost)
    let formattedHost: string

    if (isAnthropicProvider(provider)) {
      formattedHost = formatApiHost(anthropicApiHost || apiHost, appendVersion)
    } else if (
      provider.id === 'copilot' ||
      provider.id === 'github' ||
      isCherryAIProvider(provider) ||
      isPerplexityProvider(provider) ||
      isNewApiProvider(provider) ||
      isAzureOpenAIProvider(provider)
    ) {
      formattedHost = formatApiHost(apiHost, false)
    } else if (isOllamaProvider(provider)) {
      formattedHost = formatOllamaApiHost(apiHost)
    } else if (isGeminiProvider(provider)) {
      formattedHost = formatApiHost(apiHost, appendVersion, 'v1beta')
    } else if (isVertexProvider(provider)) {
      formattedHost = formatVertexApiHost(toV1ProviderShim(provider, { apiHost }) as never)
    } else {
      formattedHost = formatApiHost(apiHost, appendVersion)
    }

    if (isOllamaProvider(provider)) return `${formattedHost}/chat`
    if (provider.id === 'gateway') return `${formattedHost}/language-model`
    if (isOpenAICompatibleProvider(provider)) return `${formattedHost}/chat/completions`
    if (isAzureOpenAIProvider(provider)) {
      const version = provider.settings?.apiVersion || ''
      const path = !['preview', 'v1'].includes(version)
        ? '/v1/chat/completions?apiVersion=v1'
        : '/v1/responses?apiVersion=v1'
      return `${formattedHost}${path}`
    }
    if (isAnthropicProvider(provider)) return `${formattedHost}/messages`
    if (isGeminiProvider(provider)) return `${formattedHost}/models`
    if (isOpenAIResponsesProvider(provider)) return `${formattedHost}/responses`
    if (isVertexProvider(provider)) return `${formattedHost}/publishers/google`

    return formattedHost
  }, [anthropicApiHost, apiHost, provider])

  const anthropicHostPreview = useMemo(() => {
    const normalizedHost = formatApiHost(anthropicApiHost || providerAnthropicHost)
    return `${normalizedHost}/messages`
  }, [anthropicApiHost, providerAnthropicHost])

  const isApiHostResettable = useMemo(() => {
    return !isEmpty(providerConfig?.api?.url) && apiHost !== providerConfig?.api?.url
  }, [apiHost, providerConfig?.api?.url])

  const isApiKeyConnectable = apiKeyConnectivity.status === HealthStatus.SUCCESS

  const showApiKeyError = useCallback(() => {
    if (apiKeyConnectivity.error) {
      showErrorDetailPopup({ error: apiKeyConnectivity.error })
    }
  }, [apiKeyConnectivity.error])

  return {
    provider,
    models,
    apiKeys: apiKeysData?.keys ?? [],
    theme,
    drafts: {
      apiHost,
      setApiHost,
      anthropicApiHost,
      setAnthropicApiHost,
      apiVersion,
      setApiVersion,
      localApiKey,
      setLocalApiKey: updateLocalApiKey,
      activeHostField,
      setActiveHostField
    },
    computed: {
      providerApiKey,
      fancyProviderName,
      officialWebsite: providerConfig?.websites?.official,
      apiKeyWebsite: providerConfig?.websites?.apiKey,
      docsWebsite: providerConfig?.websites?.docs,
      modelsWebsite: providerConfig?.websites?.models,
      configuredApiHost: providerConfig?.api?.url,
      isApiKeyConnectable,
      isApiHostResettable,
      isApiKeyFieldVisible,
      isConnectionFieldVisible,
      canConfigureAnthropicHost,
      hostSelectorOptions,
      hostSelectorTooltip,
      hostPreview,
      anthropicHostPreview,
      hideApiInput,
      hideApiKeyInput,
      isAzureOpenAI,
      isDmxapi,
      isCherryIN,
      isChineseUser,
      isAnthropicOAuth,
      showApiOptionsButton
    },
    status: {
      isLoading,
      apiKeyConnectivity
    },
    actions: {
      patchProvider,
      toggleProviderEnabled,
      openApiKeyList,
      checkApi: checkApiAction,
      resetApiHost,
      commitApiHost,
      commitAnthropicApiHost,
      commitApiVersion,
      showApiKeyError
    }
  }
}
