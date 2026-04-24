import { useModelMutations } from '@renderer/hooks/useModels'
import { useProviderApiKeys, useProviderPresetMetadata } from '@renderer/hooks/useProviders'
import { getProviderLabel } from '@renderer/i18n/label'
import { useProviderModelSync } from '@renderer/pages/settings/ProviderSettings/hooks/useProviderModelSync'
import type { Model } from '@shared/data/types/model'
import type { Provider } from '@shared/data/types/provider'
import React, { memo, startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  modelListClasses,
  ProviderHelpLink,
  ProviderHelpText,
  ProviderHelpTextRow
} from '../components/ProviderSettingsPrimitives'
import ModelListCategoryChips from './ModelListCategoryChips'
import ModelListHeader from './ModelListHeader'
import ModelListSearchBar from './ModelListSearchBar'
import ModelListSections from './ModelListSections'
import { calculateModelListDerivedState, calculateModelSections, MODEL_COUNT_THRESHOLD } from './modelListViewModel'
import { useHealthCheck } from './useHealthCheck'
import { useModelListActions } from './useModelListActions'
import { useParentContentWidth } from './useParentContentWidth'

/** UI tokens: `modelListClasses` + typography helpers from ProviderSettingsPrimitives; parent supplies `.provider-settings-default-scope`. */

interface ModelListProps {
  providerId: string
  provider: Provider
  models: Model[]
}

const ModelList: React.FC<ModelListProps> = ({ providerId, provider, models }) => {
  const { elementRef: sectionRef, width: containerWidth } = useParentContentWidth<HTMLElement>()
  const { t } = useTranslation()
  const { data: apiKeysData } = useProviderApiKeys(providerId)
  const { syncProviderModels, isSyncingModels } = useProviderModelSync(providerId, { existingModels: models })
  const joinedApiKey =
    apiKeysData?.keys
      ?.filter((item) => item.isEnabled)
      .map((item) => item.key)
      .join(',') ?? ''
  const { updateModel } = useModelMutations()
  const { data: presetMetadata } = useProviderPresetMetadata(providerId)

  const docsWebsite = presetMetadata?.websites?.docs
  const modelsWebsite = presetMetadata?.websites?.models

  const [searchText, setSearchTextState] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('all')
  const [displayedModelSections, setDisplayedModelSections] = useState<ReturnType<
    typeof calculateModelSections
  > | null>(() => {
    if (models.length > MODEL_COUNT_THRESHOLD) {
      return null
    }
    return calculateModelSections(models, '', 'all')
  })

  const { isChecking: isHealthChecking, modelStatuses, runHealthCheck } = useHealthCheck(provider, joinedApiKey, models)

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

  const derivedState = useMemo(
    () =>
      calculateModelListDerivedState({
        models,
        searchText,
        selectedGroup,
        modelStatuses,
        containerWidth
      }),
    [models, searchText, selectedGroup, modelStatuses, containerWidth]
  )
  const {
    handleEditModel,
    onManageModel,
    onRefreshModels,
    onAddModel,
    onDownloadModel,
    updateVisibleModelsEnabledState,
    toggleModelEnabled,
    isBulkUpdating
  } = useModelListActions({
    provider,
    providerId,
    filteredModels: derivedState.filteredModels,
    updateModel,
    syncProviderModels,
    t
  })

  const displayedSections = displayedModelSections ?? derivedState.sections
  const enabledGroups = displayedSections.enabled
  const disabledGroups = displayedSections.disabled
  const isLoading = displayedModelSections === null
  const isBusy = isHealthChecking || isBulkUpdating || isSyncingModels

  const handleToggleVisibleModels = useCallback(
    (enabled: boolean) => {
      void updateVisibleModelsEnabledState(enabled)
    },
    [updateVisibleModelsEnabledState]
  )

  return (
    <section
      ref={sectionRef}
      data-testid="provider-model-list"
      className={modelListClasses.section}
      style={containerWidth > 0 ? { width: containerWidth, maxWidth: '100%' } : undefined}>
      <div className={modelListClasses.headerBlock}>
        <ModelListHeader
          enabledModelCount={derivedState.enabledModelCount}
          modelCount={derivedState.modelCount}
          hasVisibleModels={derivedState.hasVisibleModels}
          allEnabled={derivedState.allEnabled}
          isBusy={isBusy}
          onToggleVisibleModels={handleToggleVisibleModels}
          onRunHealthCheck={runHealthCheck}
          onManageModel={onManageModel}
        />
        <ModelListSearchBar
          provider={provider}
          searchText={searchText}
          isBusy={isBusy}
          onSearchTextChange={setSearchText}
          onRefreshModels={onRefreshModels}
          onAddModel={onAddModel}
          onDownloadModel={onDownloadModel}
        />
        {!derivedState.hasNoModels && (
          <ModelListCategoryChips
            categoryOptions={derivedState.categoryOptions}
            selectedGroup={selectedGroup}
            categoryModelCounts={derivedState.categoryModelCounts}
            chipMaxWidth={derivedState.chipMaxWidth}
            onSelectGroup={setSelectedGroup}
          />
        )}
        <ModelListSections
          isLoading={isLoading}
          hasNoModels={derivedState.hasNoModels}
          hasVisibleModels={derivedState.hasVisibleModels}
          enabledGroups={enabledGroups}
          disabledGroups={disabledGroups}
          disabledModelCount={derivedState.disabledModelCount}
          duplicateModelNames={derivedState.duplicateModelNames}
          modelStatusMap={derivedState.modelStatusMap}
          isCompact={derivedState.isCompact}
          isUltraCompact={derivedState.isUltraCompact}
          isBusy={isBusy}
          onEditModel={handleEditModel}
          onToggleModel={toggleModelEnabled}
        />
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
