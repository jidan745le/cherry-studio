import { LoadingIcon } from '@renderer/components/Icons'
import type { ModelWithStatus } from '@renderer/types/healthCheck'
import type { Model } from '@shared/data/types/model'
import { isEmpty } from 'lodash'
import type React from 'react'
import { useTranslation } from 'react-i18next'

import { modelListClasses } from '../components/ProviderSettingsPrimitives'
import ModelListGroup from './ModelListGroup'
import { countModelsInGroups, type ModelGroups } from './modelListViewModel'

interface ModelListSectionsProps {
  isLoading: boolean
  hasNoModels: boolean
  hasVisibleModels: boolean
  enabledGroups: ModelGroups
  disabledGroups: ModelGroups
  disabledModelCount: number
  duplicateModelNames: Set<string>
  modelStatusMap: Map<string, ModelWithStatus>
  isCompact: boolean
  isUltraCompact: boolean
  isBusy: boolean
  onEditModel: (model: Model) => void
  onToggleModel: (model: Model, enabled: boolean) => Promise<void>
}

const ModelListSections: React.FC<ModelListSectionsProps> = ({
  isLoading,
  hasNoModels,
  hasVisibleModels,
  enabledGroups,
  disabledGroups,
  disabledModelCount,
  duplicateModelNames,
  modelStatusMap,
  isCompact,
  isUltraCompact,
  isBusy,
  onEditModel,
  onToggleModel
}) => {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <LoadingIcon color="var(--muted-foreground)" />
      </div>
    )
  }

  if (hasNoModels) {
    return <div className={modelListClasses.emptyState}>{t('settings.models.empty')}</div>
  }

  if (!hasVisibleModels) {
    return <div className={modelListClasses.emptyState}>{t('common.no_results')}</div>
  }

  return (
    <div className={modelListClasses.listScroller}>
      <div className="flex min-h-full min-w-0 w-full flex-col gap-3">
        {!isEmpty(enabledGroups) && (
          <div className="space-y-2.5">
            <div className={modelListClasses.subsectionRow}>
              <p className={modelListClasses.subsectionTitleEnabled}>{t('settings.models.check.enabled')}</p>
              <span className={modelListClasses.subsectionRule} />
              <span className={modelListClasses.subsectionCountEnabled}>{countModelsInGroups(enabledGroups)}</span>
            </div>
            <div className="flex flex-col gap-3">
              {Object.keys(enabledGroups).map((group, index) => (
                <ModelListGroup
                  key={`enabled-${group}`}
                  groupName={group}
                  models={enabledGroups[group]}
                  duplicateModelNames={duplicateModelNames}
                  modelStatusMap={modelStatusMap}
                  isCompact={isCompact}
                  isUltraCompact={isUltraCompact}
                  defaultOpen={index <= 5}
                  disabled={isBusy}
                  onEditModel={onEditModel}
                  onToggleModel={onToggleModel}
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
                  isCompact={isCompact}
                  isUltraCompact={isUltraCompact}
                  defaultOpen={index <= 2}
                  disabled={isBusy}
                  onEditModel={onEditModel}
                  onToggleModel={onToggleModel}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ModelListSections
