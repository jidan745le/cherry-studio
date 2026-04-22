import { Button } from '@cherrystudio/ui'
import { LoadingIcon } from '@renderer/components/Icons'
import { PROVIDER_URLS } from '@renderer/config/providers'
import { useModelMutations, useModels } from '@renderer/hooks/useModels'
import { useProvider, useProviderApiKeys } from '@renderer/hooks/useProviders'
import { getProviderLabel } from '@renderer/i18n/label'
import EditModelPopup from '@renderer/pages/settings/ProviderSettings/EditModelPopup/EditModelPopup'
import AddModelPopup from '@renderer/pages/settings/ProviderSettings/ModelList/AddModelPopup'
import DownloadOVMSModelPopup from '@renderer/pages/settings/ProviderSettings/ModelList/DownloadOVMSModelPopup'
import ManageModelsPopup from '@renderer/pages/settings/ProviderSettings/ModelList/ManageModelsPopup'
import NewApiAddModelPopup from '@renderer/pages/settings/ProviderSettings/ModelList/NewApiAddModelPopup'
import { isNewApiProvider } from '@renderer/utils/provider.v2'
import type { Model } from '@shared/data/types/model'
import { parseUniqueModelId } from '@shared/data/types/model'
import { isEmpty, sortBy, toPairs } from 'lodash'
import { Download, HeartPulse, Plus, RefreshCw, Search, X } from 'lucide-react'
import React, { memo, startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ProviderHelpLink, ProviderHelpText, ProviderHelpTextRow } from '../components/ProviderSettingsPrimitives'
import { getModelGroupLabel, normalizeModelGroupName } from './grouping'
import ModelListGroup from './ModelListGroup'
import { useHealthCheck } from './useHealthCheck'
import { filterProviderSettingModelsByKeywords, getDuplicateProviderSettingModelNames } from './utils'

interface ModelListProps {
  providerId: string
}

type ModelGroups = Record<string, Model[]>
type ModelSections = {
  enabled: ModelGroups
  disabled: ModelGroups
}
const MODEL_COUNT_THRESHOLD = 10

const groupModels = (models: Model[]): ModelGroups => {
  const grouped = models.reduce<ModelGroups>((acc, model) => {
    const groupName = normalizeModelGroupName(model.group)
    if (!acc[groupName]) {
      acc[groupName] = []
    }
    acc[groupName].push(model)
    return acc
  }, {})

  return sortBy(toPairs(grouped), [0]).reduce((acc, [key, value]) => {
    acc[key] = value
    return acc
  }, {} as ModelGroups)
}

const applyModelFilters = (models: Model[], searchText: string, selectedGroup: string): Model[] => {
  const searchedModels = searchText ? filterProviderSettingModelsByKeywords(searchText, models) : models
  if (selectedGroup === 'all') {
    return searchedModels
  }

  return searchedModels.filter((model) => normalizeModelGroupName(model.group) === selectedGroup)
}

const calculateModelSections = (models: Model[], searchText: string, selectedGroup: string): ModelSections => {
  const filteredModels = applyModelFilters(models, searchText, selectedGroup)

  return {
    enabled: groupModels(filteredModels.filter((model) => model.isEnabled)),
    disabled: groupModels(filteredModels.filter((model) => !model.isEnabled))
  }
}

const countModelsInGroups = (groups: ModelGroups): number => {
  return Object.values(groups).reduce((acc, group) => acc + group.length, 0)
}

const ModelList: React.FC<ModelListProps> = ({ providerId }) => {
  const { t } = useTranslation()
  const { provider } = useProvider(providerId)
  const { models } = useModels({ providerId })
  const { data: apiKeysData } = useProviderApiKeys(providerId)
  const joinedApiKey = apiKeysData?.keys?.map((item) => item.key).join(',') ?? ''
  const { deleteModel, updateModel } = useModelMutations()
  const duplicateModelNames = useMemo(() => getDuplicateProviderSettingModelNames(models), [models])

  const removeModel = useCallback(
    async (model: Model) => {
      const { modelId } = parseUniqueModelId(model.id)
      await deleteModel(model.providerId, modelId)
    },
    [deleteModel]
  )

  const handleEditModel = useCallback(
    (model: Model) => provider && EditModelPopup.show({ provider, model }),
    [provider]
  )

  const providerConfig = provider ? PROVIDER_URLS[provider.id as keyof typeof PROVIDER_URLS] : undefined
  const docsWebsite = providerConfig?.websites?.docs
  const modelsWebsite = providerConfig?.websites?.models

  const [searchText, setSearchTextState] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [displayedModelSections, setDisplayedModelSections] = useState<ModelSections | null>(() => {
    if (models.length > MODEL_COUNT_THRESHOLD) {
      return null
    }
    return calculateModelSections(models, '', 'all')
  })

  const { isChecking: isHealthChecking, modelStatuses, runHealthCheck } = useHealthCheck(provider, joinedApiKey, models)

  const modelStatusMap = useMemo(() => {
    return new Map(modelStatuses.map((status) => [status.model.id, status]))
  }, [modelStatuses])

  const setSearchText = useCallback((text: string) => {
    startTransition(() => setSearchTextState(text))
  }, [])

  useEffect(() => {
    if (models.length > MODEL_COUNT_THRESHOLD) {
      startTransition(() => setDisplayedModelSections(calculateModelSections(models, searchText, selectedGroup)))
      return
    }

    setDisplayedModelSections(calculateModelSections(models, searchText, selectedGroup))
  }, [models, searchText, selectedGroup])

  const filteredModels = useMemo(
    () => applyModelFilters(models, searchText, selectedGroup),
    [models, searchText, selectedGroup]
  )
  const enabledModelCount = useMemo(() => filteredModels.filter((model) => model.isEnabled).length, [filteredModels])
  const disabledModelCount = filteredModels.length - enabledModelCount
  const allEnabled = filteredModels.length > 0 && filteredModels.every((model) => model.isEnabled)
  const categoryOptions = useMemo(() => {
    const groups = Array.from(new Set(models.map((model) => normalizeModelGroupName(model.group))))
    return ['all', ...sortBy(groups)]
  }, [models])

  const onManageModel = useCallback(() => {
    if (provider) {
      void ManageModelsPopup.show({ providerId: provider.id })
    }
  }, [provider])

  const onAddModel = useCallback(() => {
    if (!provider) {
      return
    }

    if (isNewApiProvider(provider)) {
      void NewApiAddModelPopup.show({ title: t('settings.models.add.add_model'), provider })
      return
    }

    void AddModelPopup.show({ title: t('settings.models.add.add_model'), provider })
  }, [provider, t])

  const onDownloadModel = useCallback(() => {
    if (provider) {
      void DownloadOVMSModelPopup.show({ title: t('ovms.download.title'), provider })
    }
  }, [provider, t])

  const updateVisibleModelsEnabledState = useCallback(
    async (enabled: boolean) => {
      const targetModels = filteredModels.filter((model) => model.isEnabled !== enabled)

      if (targetModels.length === 0) {
        return
      }

      setIsBulkUpdating(true)

      try {
        await Promise.all(
          targetModels.map((model) => {
            const { modelId } = parseUniqueModelId(model.id)
            return updateModel(model.providerId, modelId, { isEnabled: enabled })
          })
        )
      } finally {
        setIsBulkUpdating(false)
      }
    },
    [filteredModels, updateModel]
  )

  const isLoading = displayedModelSections === null
  const hasNoModels = models.length === 0
  const hasVisibleModels = filteredModels.length > 0
  const modelCount = filteredModels.length
  const enabledGroups = displayedModelSections?.enabled ?? {}
  const disabledGroups = displayedModelSections?.disabled ?? {}
  const isBusy = isHealthChecking || isBulkUpdating

  return (
    <section data-testid="provider-model-list" className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2.5">
              <h2 className="font-semibold text-(--color-foreground) text-base">{t('common.models')}</h2>
              <span className="text-(--color-muted-foreground) text-sm">
                {enabledModelCount}/{modelCount} {t('common.enabled')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto rounded-3xs px-2.5 py-[4px] text-sm text-muted-foreground/70 shadow-none hover:bg-accent/40 hover:text-foreground"
              disabled={!hasVisibleModels || isBusy}
              onClick={() => void updateVisibleModelsEnabledState(!allEnabled)}>
              {allEnabled ? t('settings.models.check.disabled') : t('settings.models.check.enabled')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto rounded-3xs px-2.5 py-[4px] text-sm text-muted-foreground/70 shadow-none hover:bg-accent/40 hover:text-foreground"
              disabled={!hasVisibleModels || isBusy}
              onClick={runHealthCheck}>
              <HeartPulse size={9} />
              {t('settings.models.check.button_caption')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto rounded-3xs px-2.5 py-[4px] text-sm text-muted-foreground/70 shadow-none hover:bg-accent/40 hover:text-foreground"
              disabled={isBusy}
              onClick={onManageModel}>
              <RefreshCw size={9} />
              {t('manage')}
            </Button>
          </div>
        </div>
        <div className="mb-2 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5 rounded-3xs border border-border/30 bg-foreground/[0.03] px-2.5 py-[5px] shadow-none">
            <Search size={10} className="shrink-0 text-foreground/55" />
            <input
              type="text"
              value={searchText}
              placeholder={t('models.search.placeholder')}
              onChange={(event) => setSearchText(event.target.value)}
              className="min-w-0 flex-1 border-none bg-transparent text-sm text-foreground/80 outline-none placeholder:text-foreground/50"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                className="text-foreground/45 transition-colors hover:text-foreground/65">
                <X size={9} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onManageModel}
              size="sm"
              className="h-auto rounded-3xs border-border/40 bg-transparent px-3 py-[6px] text-sm text-muted-foreground/70 shadow-none hover:bg-accent/40 hover:text-foreground"
              disabled={isBusy}>
              <Download size={10} />
              {t('settings.models.manage.fetch_list')}
            </Button>
            {provider?.id !== 'ovms' ? (
              <Button
                onClick={onAddModel}
                size="icon-sm"
                className="size-8 rounded-3xs border-border/40 bg-transparent text-muted-foreground/70 shadow-none hover:bg-accent/40 hover:text-foreground"
                disabled={isBusy}
                aria-label={t('settings.models.add.add_model')}>
                <Plus size={11} />
              </Button>
            ) : (
              <Button
                onClick={onDownloadModel}
                size="icon-sm"
                className="size-8 rounded-3xs border-border/40 bg-transparent text-muted-foreground/70 shadow-none hover:bg-accent/40 hover:text-foreground"
                disabled={isBusy}
                aria-label={t('button.download')}>
                <Plus size={11} />
              </Button>
            )}
          </div>
        </div>
        {!hasNoModels && (
          <div className="mb-2.5 flex flex-wrap items-center gap-[5px]">
            {categoryOptions.map((group) => {
              const isActive = selectedGroup === group
              const label = group === 'all' ? t('settings.models.check.all') : getModelGroupLabel(group, t)

              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setSelectedGroup(group)}
                  className={
                    isActive
                      ? 'rounded-3xs border border-foreground/[0.15] bg-foreground/[0.1] px-2.5 py-[4px] text-xs text-foreground/85'
                      : 'rounded-3xs border border-foreground/[0.12] bg-transparent px-2.5 py-[4px] text-xs text-foreground/65 transition hover:border-foreground/[0.2] hover:bg-accent/40 hover:text-foreground/80'
                  }>
                  {label}
                </button>
              )
            })}
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <LoadingIcon color="var(--color-text-2)" />
          </div>
        ) : hasNoModels ? (
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-(--color-border) border-dashed bg-(--color-background-soft) px-4 text-center text-(--color-muted-foreground) text-sm">
            {t('settings.models.empty')}
          </div>
        ) : !hasVisibleModels ? (
          <div className="flex min-h-40 items-center justify-center rounded-2xl border border-(--color-border) border-dashed bg-(--color-background-soft) px-4 text-center text-(--color-muted-foreground) text-sm">
            {t('common.no_results')}
          </div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto -mx-1 [&::-webkit-scrollbar-thumb]:bg-border/20 [&::-webkit-scrollbar]:w-[2px]">
            <div className="flex flex-col gap-5">
              {!isEmpty(enabledGroups) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <p className="font-medium text-foreground/75 text-xs">{t('settings.models.check.enabled')}</p>
                    <span className="text-foreground/60 text-xs">{countModelsInGroups(enabledGroups)}</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {Object.keys(enabledGroups).map((group, index) => (
                      <ModelListGroup
                        key={`enabled-${group}`}
                        groupName={group}
                        models={enabledGroups[group]}
                        duplicateModelNames={duplicateModelNames}
                        modelStatusMap={modelStatusMap}
                        defaultOpen={index <= 5}
                        disabled={isBusy}
                        onEditModel={handleEditModel}
                        onRemoveModel={removeModel}
                        onRemoveGroup={() => enabledGroups[group].forEach((model) => void removeModel(model))}
                      />
                    ))}
                  </div>
                </div>
              )}
              {!isEmpty(disabledGroups) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <p className="font-medium text-foreground/70 text-xs">{t('settings.models.check.disabled')}</p>
                    <span className="text-foreground/55 text-xs">{disabledModelCount}</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {Object.keys(disabledGroups).map((group, index) => (
                      <ModelListGroup
                        key={`disabled-${group}`}
                        groupName={group}
                        models={disabledGroups[group]}
                        duplicateModelNames={duplicateModelNames}
                        modelStatusMap={modelStatusMap}
                        defaultOpen={index <= 2}
                        disabled={isBusy}
                        onEditModel={handleEditModel}
                        onRemoveModel={removeModel}
                        onRemoveGroup={() => disabledGroups[group].forEach((model) => void removeModel(model))}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {(docsWebsite || modelsWebsite) && (
        <div className="flex items-center justify-between">
          <ProviderHelpTextRow>
            <ProviderHelpText>{t('settings.provider.docs_check')} </ProviderHelpText>
            {docsWebsite && (
              <ProviderHelpLink target="_blank" href={docsWebsite}>
                {`${getProviderLabel(provider?.id ?? '')} `}
                {t('common.docs')}
              </ProviderHelpLink>
            )}
            {docsWebsite && modelsWebsite && <ProviderHelpText>{t('common.and')}</ProviderHelpText>}
            {modelsWebsite && (
              <ProviderHelpLink target="_blank" href={modelsWebsite}>
                {t('common.models')}
              </ProviderHelpLink>
            )}
            <ProviderHelpText>{t('settings.provider.docs_more_details')}</ProviderHelpText>
          </ProviderHelpTextRow>
        </div>
      )}
    </section>
  )
}

export default memo(ModelList)
