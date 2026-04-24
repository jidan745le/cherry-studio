import type React from 'react'
import { useTranslation } from 'react-i18next'

import { modelListClasses } from '../components/ProviderSettingsPrimitives'
import { getModelGroupLabel } from './grouping'
import type { ModelListCategoryOption } from './modelListViewModel'

interface ModelListCategoryChipsProps {
  categoryOptions: ModelListCategoryOption[]
  selectedGroup: string
  categoryModelCounts: Record<string, number>
  chipMaxWidth: number | undefined
  onSelectGroup: (group: string) => void
}

const ModelListCategoryChips: React.FC<ModelListCategoryChipsProps> = ({
  categoryOptions,
  selectedGroup,
  categoryModelCounts,
  chipMaxWidth,
  onSelectGroup
}) => {
  const { t } = useTranslation()

  return (
    <div className={modelListClasses.chipRow}>
      {categoryOptions.map((group) => {
        const isActive = selectedGroup === group
        const label = group === 'all' ? t('settings.models.check.all') : getModelGroupLabel(group, t)
        const count = categoryModelCounts[group] ?? 0

        return (
          <button
            key={group}
            type="button"
            onClick={() => onSelectGroup(group)}
            className={isActive ? modelListClasses.chipActive : modelListClasses.chipIdle}
            style={chipMaxWidth ? { maxWidth: chipMaxWidth } : undefined}>
            <span className={modelListClasses.chipLabel}>{label}</span>
            <span className={modelListClasses.chipCount}>{count}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ModelListCategoryChips
