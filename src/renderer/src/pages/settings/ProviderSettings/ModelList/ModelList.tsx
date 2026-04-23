import { Button } from '@cherrystudio/ui'
import { LoadingIcon } from '@renderer/components/Icons'
import { PROVIDER_URLS } from '@renderer/config/providers'
import { useModelMutations, useModels } from '@renderer/hooks/useModels'
import { useProvider, useProviderApiKeys } from '@renderer/hooks/useProviders'
import { getProviderLabel } from '@renderer/i18n/label'
import EditModelPopup from '@renderer/pages/settings/ProviderSettings/EditModelPopup/EditModelPopup'
import { useProviderModelSync } from '@renderer/pages/settings/ProviderSettings/hooks/useProviderModelSync'
import AddModelPopup from '@renderer/pages/settings/ProviderSettings/ModelList/AddModelPopup'
import DownloadOVMSModelPopup from '@renderer/pages/settings/ProviderSettings/ModelList/DownloadOVMSModelPopup'
import ManageModelsPopup from '@renderer/pages/settings/ProviderSettings/ModelList/ManageModelsPopup'
import NewApiAddModelPopup from '@renderer/pages/settings/ProviderSettings/ModelList/NewApiAddModelPopup'
import { cn } from '@renderer/utils'
import { isNewApiProvider } from '@renderer/utils/provider.v2'
import type { Model } from '@shared/data/types/model'
import { parseUniqueModelId } from '@shared/data/types/model'
import { isEmpty, sortBy, toPairs } from 'lodash'
import { Download, Eye, EyeOff, HeartPulse, Plus, Search, X } from 'lucide-react'
import React, { memo, startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  modelListClasses,
  ProviderHelpLink,
  ProviderHelpText,
  ProviderHelpTextRow
} from '../components/ProviderSettingsPrimitives'
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
  const { syncProviderModels, isSyncingModels } = useProviderModelSync(providerId)
  const joinedApiKey =
    apiKeysData?.keys
      ?.filter((item) => item.isEnabled)
      .map((item) => item.key)
      .join(',') ?? ''
  const { updateModel } = useModelMutations()
  const duplicateModelNames = useMemo(() => getDuplicateProviderSettingModelNames(models), [models])

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

  const categoryModelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: models.length }
    for (const model of models) {
      const g = normalizeModelGroupName(model.group)
      counts[g] = (counts[g] ?? 0) + 1
    }
    return counts
  }, [models])

  const onManageModel = useCallback(() => {
    if (provider) {
      void ManageModelsPopup.show({ providerId: provider.id })
    }
  }, [provider])

  const onRefreshModels = useCallback(() => {
    if (provider) {
      void syncProviderModels(provider)
    }
  }, [provider, syncProviderModels])

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
  const toggleModelEnabled = useCallback(
    async (model: Model, enabled: boolean) => {
      const { modelId } = parseUniqueModelId(model.id)
      await updateModel(model.providerId, modelId, { isEnabled: enabled })
    },
    [updateModel]
  )

  const isLoading = displayedModelSections === null
  const hasNoModels = models.length === 0
  const hasVisibleModels = filteredModels.length > 0
  const modelCount = filteredModels.length
  const enabledGroups = displayedModelSections?.enabled ?? {}
  const disabledGroups = displayedModelSections?.disabled ?? {}
  const isBusy = isHealthChecking || isBulkUpdating || isSyncingModels

  return (
    <section data-testid="provider-model-list" className={modelListClasses.section}>
      <div className={modelListClasses.headerBlock}>
        <div className={modelListClasses.titleRow}>
          <div className="min-w-0">
            <div className={modelListClasses.titleWrap}>
              <h2 className={modelListClasses.sectionTitle}>{t('common.models')}</h2>
              <span className={modelListClasses.countMeta}>
                {enabledModelCount}/{modelCount} {t('common.enabled')}
              </span>
            </div>
          </div>
          <div className={modelListClasses.titleActions}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(modelListClasses.toolbarHeaderGhost, 'gap-1')}
              disabled={!hasVisibleModels || isBusy}
              onClick={() => void updateVisibleModelsEnabledState(!allEnabled)}>
              {allEnabled ? (
                <EyeOff className={modelListClasses.toolbarHeaderIcon} />
              ) : (
                <Eye className={modelListClasses.toolbarHeaderIcon} />
              )}
              {allEnabled ? t('settings.models.check.disabled') : t('settings.models.check.enabled')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(modelListClasses.toolbarHeaderGhost, 'gap-1')}
              disabled={!hasVisibleModels || isBusy}
              onClick={runHealthCheck}>
              <HeartPulse className={modelListClasses.toolbarHeaderIcon} />
              {t('settings.models.check.button_caption')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(modelListClasses.toolbarHeaderGhost, 'gap-1')}
              disabled={isBusy}
              onClick={onManageModel}>
              {t('manage')}
            </Button>
          </div>
        </div>
        <div className={modelListClasses.searchRow}>
          <div className={modelListClasses.searchWrap}>
            <Search className={modelListClasses.searchIcon} />
            <input
              type="text"
              value={searchText}
              placeholder={t('models.search.placeholder')}
              onChange={(event) => setSearchText(event.target.value)}
              className={modelListClasses.searchInput}
            />
            {searchText && (
              <button type="button" onClick={() => setSearchText('')} className={modelListClasses.searchClear}>
                <X size={9} />
              </button>
            )}
          </div>
          <div className={modelListClasses.searchActions}>
            <Button
              variant="outline"
              onClick={onRefreshModels}
              size="sm"
              className={cn(modelListClasses.fetchOutline, 'gap-1.5')}
              disabled={isBusy}>
              <Download className={modelListClasses.toolbarIcon} />
              {t('settings.models.manage.fetch_list')}
            </Button>
            {provider?.id !== 'ovms' ? (
              <Button
                onClick={onAddModel}
                size="icon-sm"
                className={modelListClasses.addIconButton}
                disabled={isBusy}
                aria-label={t('settings.models.add.add_model')}>
                <Plus className={modelListClasses.toolbarIcon} />
              </Button>
            ) : (
              <Button
                onClick={onDownloadModel}
                size="icon-sm"
                className={modelListClasses.addIconButton}
                disabled={isBusy}
                aria-label={t('button.download')}>
                <Plus className={modelListClasses.toolbarIcon} />
              </Button>
            )}
          </div>
        </div>
        {!hasNoModels && (
          <div className={modelListClasses.chipRow}>
            {categoryOptions.map((group) => {
              const isActive = selectedGroup === group
              const label = group === 'all' ? t('settings.models.check.all') : getModelGroupLabel(group, t)
              const count = categoryModelCounts[group] ?? 0

              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setSelectedGroup(group)}
                  className={isActive ? modelListClasses.chipActive : modelListClasses.chipIdle}>
                  <span className={modelListClasses.chipLabel}>{label}</span>
                  <span className={modelListClasses.chipCount}>{count}</span>
                </button>
              )
            })}
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <LoadingIcon color="var(--muted-foreground)" />
          </div>
        ) : hasNoModels ? (
          <div className={modelListClasses.emptyState}>{t('settings.models.empty')}</div>
        ) : !hasVisibleModels ? (
          <div className={modelListClasses.emptyState}>{t('common.no_results')}</div>
        ) : (
          <div className={modelListClasses.listScroller}>
            <div className="flex flex-col gap-3">
              {!isEmpty(enabledGroups) && (
                <div className="space-y-2.5">
                  <div className={modelListClasses.subsectionRow}>
                    <p className={modelListClasses.subsectionTitleEnabled}>{t('settings.models.check.enabled')}</p>
                    <span className={modelListClasses.subsectionRule} />
                    <span className={modelListClasses.subsectionCountEnabled}>
                      {countModelsInGroups(enabledGroups)}
                    </span>
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
                        onToggleModel={toggleModelEnabled}
                      />
                    ))}
                  </div>
                </div>
              )}
              {!isEmpty(disabledGroups) && (
                <div className="space-y-2.5">
                  <div className={modelListClasses.subsectionRow}>
                    <p className={modelListClasses.subsectionTitleDisabled}>{t('settings.models.check.disabled')}</p>
                    <span className={modelListClasses.subsectionRule} />
                    <span className={modelListClasses.subsectionCountDisabled}>{disabledModelCount}</span>
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
                        onToggleModel={toggleModelEnabled}
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
