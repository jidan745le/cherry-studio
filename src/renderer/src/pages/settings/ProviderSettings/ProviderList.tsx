import {
  Badge,
  MenuItem,
  MenuList,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  ReorderableList
} from '@cherrystudio/ui'
import ModelNotesPopup from '@renderer/pages/settings/ProviderSettings/ModelNotesPopup'
import { cn } from '@renderer/utils'
import {
  getFancyProviderName,
  isAnthropicSupportedProvider,
  isSystemProvider,
  matchKeywordsInProvider
} from '@renderer/utils/provider.v2'
import type { Provider } from '@shared/data/types/provider'
import { Check, Edit, Filter, PlusIcon, Search, Trash2, UserPen } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ProviderListItem from './components/ProviderListItem'

interface ProviderListProps {
  providers: Provider[]
  selectedProviderId?: string
  providerLogos: Record<string, string>
  isOvmsSupported: boolean
  agentFilterEnabled: boolean
  onAgentFilterEnabledChange: (enabled: boolean) => void
  onSelectProvider: (providerId: string) => void
  onAddProvider: () => Promise<void>
  onEditProvider: (provider: Provider) => Promise<void>
  onDeleteProvider: (provider: Provider) => Promise<void>
  onReorder: (providers: Provider[]) => Promise<void>
}

export default function ProviderList({
  providers,
  selectedProviderId,
  providerLogos,
  isOvmsSupported,
  agentFilterEnabled,
  onAgentFilterEnabledChange,
  onSelectProvider,
  onAddProvider,
  onEditProvider,
  onDeleteProvider,
  onReorder
}: ProviderListProps) {
  const { t } = useTranslation()
  const [searchText, setSearchText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [contextProviderId, setContextProviderId] = useState<string | null>(null)
  const itemRefs = useRef(new Map<string, HTMLDivElement | null>())

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      if (provider.id === 'ovms' && !isOvmsSupported) {
        return false
      }

      if (agentFilterEnabled && !isAnthropicSupportedProvider(provider)) {
        return false
      }

      const keywords = searchText.toLowerCase().split(/\s+/).filter(Boolean)
      return matchKeywordsInProvider(keywords, provider)
    })
  }, [agentFilterEnabled, isOvmsSupported, providers, searchText])

  const providerCounts = useMemo(() => {
    return providers.reduce<Map<string, number>>((counts, provider) => {
      counts.set(provider.id, (counts.get(provider.id) ?? 0) + 1)
      return counts
    }, new Map())
  }, [providers])

  const setProviderItemRef = useCallback((providerId: string, element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current.set(providerId, element)
      return
    }

    itemRefs.current.delete(providerId)
  }, [])

  useEffect(() => {
    if (!selectedProviderId) {
      return
    }

    const scrollSelectedItem = () => {
      itemRefs.current.get(selectedProviderId)?.scrollIntoView?.({
        block: 'center',
        behavior: 'smooth'
      })
    }

    if (typeof window.requestAnimationFrame !== 'function') {
      scrollSelectedItem()
      return
    }

    const frameId = window.requestAnimationFrame(scrollSelectedItem)

    return () => window.cancelAnimationFrame(frameId)
  }, [filteredProviders, selectedProviderId])

  const handleDragStateChange = useCallback((nextDragging: boolean) => {
    setDragging(nextDragging)
    if (nextDragging) {
      setContextProviderId(null)
    }
  }, [])

  return (
    <aside className="flex h-full w-[250px] shrink-0 flex-col border-foreground/[0.05] border-r bg-(--color-sidebar)">
      <div className="flex shrink-0 items-start justify-between gap-2 px-3 pt-3.5 pb-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-semibold text-(--color-foreground) text-sm">
                {t('settings.provider.title')}
              </h2>
              <Badge variant="outline" className="h-5 rounded-full px-2 py-0 text-xs">
                {filteredProviders.length}
              </Badge>
            </div>
          </div>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={dragging}
              className="flex size-7 items-center justify-center rounded-3xs text-foreground/55 transition-colors hover:bg-accent/40 hover:text-foreground">
              <Filter size={11} className={cn(agentFilterEnabled && 'text-(--color-primary)')} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-40 p-1">
            <MenuList>
              <MenuItem
                label={t('settings.provider.filter.all')}
                className="rounded-3xs px-2 py-[5px] text-[11px] hover:bg-accent/40"
                icon={
                  <Check
                    className={cn('size-4', !agentFilterEnabled && 'opacity-100', agentFilterEnabled && 'opacity-0')}
                  />
                }
                onClick={() => onAgentFilterEnabledChange(false)}
              />
              <MenuItem
                label={t('settings.provider.filter.agent')}
                className="rounded-3xs px-2 py-[5px] text-[11px] hover:bg-accent/40"
                icon={
                  <Check
                    className={cn('size-4', agentFilterEnabled && 'opacity-100', !agentFilterEnabled && 'opacity-0')}
                  />
                }
                onClick={() => onAgentFilterEnabledChange(true)}
              />
            </MenuList>
          </PopoverContent>
        </Popover>
      </div>
      <div className="px-3 pb-1.5">
        <div className="flex items-center gap-2 rounded-3xs border border-border/30 bg-foreground/[0.03] px-3 py-2 shadow-none">
          <Search size={14} className="shrink-0 text-foreground/50" />
          <input
            value={searchText}
            placeholder={t('settings.provider.search')}
            onChange={(event) => setSearchText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                setSearchText('')
              }
            }}
            disabled={dragging}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground/80 outline-none placeholder:text-foreground/40"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2 [&::-webkit-scrollbar-thumb]:bg-border/20 [&::-webkit-scrollbar]:w-[2px]">
        {filteredProviders.length > 0 ? (
          <ReorderableList
            items={providers}
            visibleItems={filteredProviders}
            getId={(provider) => provider.id}
            onDragStateChange={handleDragStateChange}
            onReorder={onReorder}
            className="w-full"
            gap={1}
            restrictions={{ scrollableAncestor: true }}
            renderItem={(provider, _index, state) => {
              const duplicateProviderCount = providerCounts.get(provider.id) ?? 0
              const showManagementActions = duplicateProviderCount > 1 || !isSystemProvider(provider)

              return (
                <Popover
                  open={contextProviderId === provider.id}
                  onOpenChange={(open) => setContextProviderId(open ? provider.id : null)}>
                  <PopoverAnchor asChild>
                    <div
                      className="w-full"
                      ref={(element) => setProviderItemRef(provider.id, element)}
                      onContextMenu={(event) => {
                        event.preventDefault()
                        setContextProviderId(provider.id)
                      }}>
                      <ProviderListItem
                        provider={{ ...provider, name: getFancyProviderName(provider) }}
                        selected={provider.id === selectedProviderId}
                        dragging={state.dragging}
                        customLogos={providerLogos}
                        onClick={() => onSelectProvider(provider.id)}
                      />
                    </div>
                  </PopoverAnchor>
                  <PopoverContent align="start" className="w-44 p-1">
                    <MenuList>
                      {showManagementActions && (
                        <MenuItem
                          label={t('common.edit')}
                          className="rounded-3xs px-2 py-[5px] text-[11px] hover:bg-accent/40"
                          icon={<Edit size={14} />}
                          onClick={() => void onEditProvider(provider)}
                        />
                      )}
                      <MenuItem
                        label={t('settings.provider.notes.title')}
                        className="rounded-3xs px-2 py-[5px] text-[11px] hover:bg-accent/40"
                        icon={<UserPen size={14} />}
                        onClick={() => ModelNotesPopup.show({ providerId: provider.id })}
                      />
                      {showManagementActions && (
                        <MenuItem
                          label={t('common.delete')}
                          icon={<Trash2 size={14} />}
                          onClick={() => void onDeleteProvider(provider)}
                          className="rounded-3xs px-2 py-[5px] text-(--color-destructive) text-[11px] hover:bg-accent/40"
                        />
                      )}
                    </MenuList>
                  </PopoverContent>
                </Popover>
              )
            }}
          />
        ) : (
          <div className="flex h-full min-h-40 items-center justify-center px-3 text-center text-(--color-muted-foreground) text-sm">
            {t('common.no_results')}
          </div>
        )}
      </div>
      <div className="shrink-0 border-foreground/[0.04] border-t px-2.5 py-2">
        <button
          type="button"
          onClick={() => void onAddProvider()}
          disabled={dragging}
          className="flex w-full items-center justify-center gap-2 rounded-3xs border border-border/40 border-dashed bg-transparent py-2 text-[11px] text-muted-foreground/70 shadow-none transition-colors hover:bg-accent/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-40">
          <PlusIcon size={14} />
          <span>{t('button.add')}</span>
        </button>
      </div>
    </aside>
  )
}
