import { useReorder } from '@data/hooks/useReorder'
import { useProviders } from '@renderer/hooks/useProviders'
import type { Provider } from '@shared/data/types/provider'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react'

import { useProviderSidebarAdapter } from './adapters/providerSidebarAdapter'
import ProviderList from './ProviderList'
import ProviderSetting from './ProviderSetting'

interface ProviderSettingsPageProps {
  isOnboarding?: boolean
}

export default function ProviderSettingsPage({ isOnboarding = false }: ProviderSettingsPageProps) {
  const search = useSearch({ strict: false }) as Record<string, string | undefined>
  const navigate = useNavigate()
  const { providers: rawProviders, createProvider } = useProviders()
  const { applyReorderedList } = useReorder('/providers')
  const [selectedProviderId, setSelectedProviderIdState] = useState<string>()
  const [agentFilterEnabled, setAgentFilterEnabled] = useState(false)

  const providers = useMemo(() => (Array.isArray(rawProviders) ? rawProviders : []), [rawProviders])

  const setSelectedProviderId = useCallback((providerId: string | undefined) => {
    startTransition(() => setSelectedProviderIdState(providerId))
  }, [])

  useEffect(() => {
    if (!selectedProviderId && providers[0]) {
      setSelectedProviderId(providers[0].id)
    }
  }, [providers, selectedProviderId, setSelectedProviderId])

  useEffect(() => {
    let shouldConsume = false

    if (search.filter === 'agent') {
      setAgentFilterEnabled(true)
      shouldConsume = true
    }

    if (search.id) {
      const provider = providers.find((item) => item.id === search.id)
      setSelectedProviderId(provider?.id ?? providers[0]?.id)
      shouldConsume = true
    }

    if (shouldConsume) {
      const restSearch = Object.fromEntries(Object.entries(search).filter(([key]) => key !== 'filter' && key !== 'id'))
      void navigate({ to: '/settings/provider', search: restSearch as Record<string, string>, replace: true })
    }
  }, [navigate, providers, search, setSelectedProviderId])

  const sidebar = useProviderSidebarAdapter({
    providers,
    searchAddProviderData: search.addProviderData,
    createProvider,
    onSelectProvider: (providerId) => setSelectedProviderId(providerId)
  })

  useEffect(() => {
    if (!selectedProviderId && providers[0]?.id) {
      setSelectedProviderId(providers[0].id)
      return
    }

    if (selectedProviderId && !providers.some((provider) => provider.id === selectedProviderId)) {
      setSelectedProviderId(providers[0]?.id)
    }
  }, [providers, selectedProviderId, setSelectedProviderId])

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedProviderId),
    [providers, selectedProviderId]
  )

  return (
    <div className="scope-tailwind-default-theme flex h-full min-h-0 w-full overflow-hidden bg-(--color-background)">
      <ProviderList
        providers={providers}
        selectedProviderId={selectedProviderId}
        providerLogos={sidebar.providerLogos}
        isOvmsSupported={sidebar.isOvmsSupported}
        agentFilterEnabled={agentFilterEnabled}
        onAgentFilterEnabledChange={setAgentFilterEnabled}
        onSelectProvider={setSelectedProviderId}
        onAddProvider={sidebar.handleAddProvider}
        onEditProvider={sidebar.handleEditProvider}
        onDeleteProvider={sidebar.handleDeleteProvider}
        onReorder={applyReorderedList as (providers: Provider[]) => Promise<void>}
      />
      {selectedProvider && (
        <ProviderSetting providerId={selectedProvider.id} key={selectedProvider.id} isOnboarding={isOnboarding} />
      )}
    </div>
  )
}
