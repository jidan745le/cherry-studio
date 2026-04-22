import { dataApiService } from '@data/DataApiService'
import { loggerService } from '@logger'
import { useProviderActions } from '@renderer/hooks/useProviders'
import ImageStorage from '@renderer/services/ImageStorage'
import type { ProviderType } from '@renderer/types'
import { uuid } from '@renderer/utils'
import type { CreateProviderDto } from '@shared/data/api/schemas/providers'
import { ENDPOINT_TYPE, type EndpointType } from '@shared/data/types/model'
import type { Provider } from '@shared/data/types/provider'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useSWRImmutable from 'swr/immutable'

import AddProviderPopup from '../AddProviderPopup'
import UrlSchemaInfoPopup from '../UrlSchemaInfoPopup'

const logger = loggerService.withContext('providerSidebarAdapter')

interface UseProviderSidebarAdapterParams {
  providers: Provider[]
  searchAddProviderData?: string
  onSelectProvider: (providerId: string) => void
  createProvider: (dto: CreateProviderDto) => Promise<Provider>
}

const getIsOvmsSupported = async (): Promise<boolean> => {
  try {
    return await window.api.ovms.isSupported()
  } catch (error) {
    logger.warn('Fetching isOvmsSupported failed. Fallback to false.', error as Error)
    return false
  }
}

function resolveDefaultEndpoint(type?: string): EndpointType {
  switch (type) {
    case 'anthropic':
    case 'vertex-anthropic':
      return ENDPOINT_TYPE.ANTHROPIC_MESSAGES
    case 'openai-response':
      return ENDPOINT_TYPE.OPENAI_RESPONSES
    case 'gemini':
    case 'vertexai':
      return ENDPOINT_TYPE.GOOGLE_GENERATE_CONTENT
    case 'ollama':
      return ENDPOINT_TYPE.OLLAMA_CHAT
    default:
      return ENDPOINT_TYPE.OPENAI_CHAT_COMPLETIONS
  }
}

async function saveProviderLogo(providerId: string, logo: string) {
  await ImageStorage.set(`provider-${providerId}`, logo)
}

async function clearProviderLogo(providerId: string) {
  await ImageStorage.set(`provider-${providerId}`, '')
}

export function useProviderSidebarAdapter({
  providers,
  searchAddProviderData,
  onSelectProvider,
  createProvider
}: UseProviderSidebarAdapterParams) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { updateProviderById, deleteProviderById } = useProviderActions()
  const [providerLogos, setProviderLogos] = useState<Record<string, string>>({})
  const { data: isOvmsSupported } = useSWRImmutable('ovms/isSupported', getIsOvmsSupported)

  useEffect(() => {
    const loadAllLogos = async () => {
      const logos: Record<string, string> = {}

      for (const provider of providers) {
        try {
          const logo = await ImageStorage.get(`provider-${provider.id}`)
          if (logo) {
            logos[provider.id] = logo
          }
        } catch (error) {
          logger.error(`Failed to load logo for provider ${provider.id}`, error as Error)
        }
      }

      setProviderLogos(logos)
    }

    void loadAllLogos()
  }, [providers])

  useEffect(() => {
    if (!searchAddProviderData) {
      return
    }

    const importProvider = async (draft: {
      id: string
      apiKey: string
      baseUrl: string
      type?: ProviderType
      name?: string
    }) => {
      const { id } = draft
      const { updatedProvider, isNew, displayName } = await UrlSchemaInfoPopup.show(draft)

      if (!updatedProvider) {
        void navigate({ to: '/settings/provider' })
        return
      }

      const defaultChatEndpoint = resolveDefaultEndpoint(updatedProvider.type)
      const endpointConfigs = updatedProvider.apiHost
        ? {
            [defaultChatEndpoint]: {
              baseUrl: updatedProvider.apiHost
            }
          }
        : undefined

      if (isNew) {
        await createProvider({
          providerId: updatedProvider.id,
          name: updatedProvider.name || id,
          defaultChatEndpoint,
          endpointConfigs
        })
      } else {
        await updateProviderById(updatedProvider.id, {
          name: updatedProvider.name,
          defaultChatEndpoint,
          endpointConfigs
        })
      }

      if (updatedProvider.apiKey.trim()) {
        await dataApiService.post(`/providers/${updatedProvider.id}/api-keys`, {
          body: { key: updatedProvider.apiKey.trim() }
        })
      }

      onSelectProvider(id)
      void navigate({ to: '/settings/provider', search: { id } })
      window.toast.success(t('settings.models.provider_key_added', { provider: displayName }))
    }

    try {
      const parsed = JSON.parse(searchAddProviderData) as {
        id: string
        apiKey: string
        baseUrl: string
        type?: ProviderType
        name?: string
      }

      if (!parsed.id || !parsed.apiKey || !parsed.baseUrl) {
        window.toast.error(t('settings.models.provider_key_add_failed_by_invalid_data'))
        void navigate({ to: '/settings/provider' })
        return
      }

      void importProvider(parsed)
    } catch (error) {
      window.toast.error(t('settings.models.provider_key_add_failed_by_invalid_data'))
      void navigate({ to: '/settings/provider' })
    }
  }, [createProvider, navigate, onSelectProvider, searchAddProviderData, t, updateProviderById])

  const handleAddProvider = useCallback(async () => {
    const { name, defaultChatEndpoint, logo } = await AddProviderPopup.show()

    if (!name.trim()) {
      return
    }

    const providerId = uuid()

    if (logo) {
      try {
        await saveProviderLogo(providerId, logo)
        setProviderLogos((previous) => ({ ...previous, [providerId]: logo }))
      } catch (error) {
        logger.error('Failed to save logo', error as Error)
        window.toast.error(t('message.error.save_provider_logo'))
      }
    }

    const provider = await createProvider({
      providerId,
      name: name.trim(),
      defaultChatEndpoint
    })

    onSelectProvider(provider.id)
  }, [createProvider, onSelectProvider, t])

  const handleEditProvider = useCallback(
    async (provider: Provider) => {
      const { name, defaultChatEndpoint, logoFile, logo } = await AddProviderPopup.show(provider)

      if (!name.trim()) {
        return
      }

      await updateProviderById(provider.id, {
        name: name.trim(),
        defaultChatEndpoint
      })

      if (logo) {
        try {
          await saveProviderLogo(provider.id, logo)
          setProviderLogos((previous) => ({ ...previous, [provider.id]: logo }))
        } catch (error) {
          logger.error('Failed to save logo', error as Error)
          window.toast.error(t('message.error.update_provider_logo'))
        }
        return
      }

      if (logo === undefined && logoFile === undefined) {
        try {
          await clearProviderLogo(provider.id)
          setProviderLogos((previous) => {
            const nextLogos = { ...previous }
            delete nextLogos[provider.id]
            return nextLogos
          })
        } catch (error) {
          logger.error('Failed to reset logo', error as Error)
        }
      }
    },
    [t, updateProviderById]
  )

  const handleDeleteProvider = useCallback(
    async (provider: Provider) => {
      window.modal.confirm({
        title: t('settings.provider.delete.title'),
        content: t('settings.provider.delete.content'),
        okButtonProps: { danger: true },
        okText: t('common.delete'),
        centered: true,
        onOk: async () => {
          try {
            await ImageStorage.remove(`provider-${provider.id}`)
            setProviderLogos((previous) => {
              const nextLogos = { ...previous }
              delete nextLogos[provider.id]
              return nextLogos
            })
          } catch (error) {
            logger.error('Failed to delete logo', error as Error)
          }

          onSelectProvider(providers.find((item) => item.id !== provider.id)?.id ?? '')
          await deleteProviderById(provider.id)
        }
      })
    },
    [deleteProviderById, onSelectProvider, providers, t]
  )

  return {
    providerLogos,
    isOvmsSupported: Boolean(isOvmsSupported),
    handleAddProvider,
    handleEditProvider,
    handleDeleteProvider
  }
}
