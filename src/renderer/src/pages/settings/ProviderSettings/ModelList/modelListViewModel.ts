import type { ModelWithStatus } from '@renderer/types/healthCheck'
import type { Model } from '@shared/data/types/model'
import { sortBy, toPairs } from 'lodash'

import { normalizeModelGroupName } from './grouping'
import { filterProviderSettingModelsByKeywords, getDuplicateProviderSettingModelNames } from './utils'

export type ModelGroups = Record<string, Model[]>

export type ModelSections = {
  enabled: ModelGroups
  disabled: ModelGroups
}

export type ModelListCategoryOption = string

export type ModelListDerivedState = {
  filteredModels: Model[]
  sections: ModelSections
  categoryOptions: ModelListCategoryOption[]
  categoryModelCounts: Record<string, number>
  duplicateModelNames: Set<string>
  enabledModelCount: number
  disabledModelCount: number
  modelCount: number
  hasVisibleModels: boolean
  hasNoModels: boolean
  allEnabled: boolean
  isCompact: boolean
  isUltraCompact: boolean
  chipMaxWidth: number | undefined
  modelStatusMap: Map<string, ModelWithStatus>
}

export const MODEL_COUNT_THRESHOLD = 10

type ModelListViewModelInput = {
  models: Model[]
  searchText: string
  selectedGroup: string
  modelStatuses: ModelWithStatus[]
  containerWidth: number
}

export const groupModels = (models: Model[]): ModelGroups => {
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

export const applyModelFilters = (models: Model[], searchText: string, selectedGroup: string): Model[] => {
  const searchedModels = searchText ? filterProviderSettingModelsByKeywords(searchText, models) : models
  if (selectedGroup === 'all') {
    return searchedModels
  }

  return searchedModels.filter((model) => normalizeModelGroupName(model.group) === selectedGroup)
}

export const calculateModelSections = (models: Model[], searchText: string, selectedGroup: string): ModelSections => {
  const filteredModels = applyModelFilters(models, searchText, selectedGroup)

  return {
    enabled: groupModels(filteredModels.filter((model) => model.isEnabled)),
    disabled: groupModels(filteredModels.filter((model) => !model.isEnabled))
  }
}

export const countModelsInGroups = (groups: ModelGroups): number => {
  return Object.values(groups).reduce((acc, group) => acc + group.length, 0)
}

const getCategoryOptions = (models: Model[]): ModelListCategoryOption[] => {
  const groups = Array.from(new Set(models.map((model) => normalizeModelGroupName(model.group))))
  return ['all', ...sortBy(groups)]
}

const getCategoryModelCounts = (models: Model[]): Record<string, number> => {
  const counts: Record<string, number> = { all: models.length }
  for (const model of models) {
    const groupName = normalizeModelGroupName(model.group)
    counts[groupName] = (counts[groupName] ?? 0) + 1
  }
  return counts
}

const getChipMaxWidth = (containerWidth: number): number | undefined => {
  if (containerWidth <= 0) {
    return undefined
  }

  if (containerWidth < 520) {
    return Math.max(containerWidth - 12, 96)
  }

  if (containerWidth < 860) {
    return Math.max(Math.floor((containerWidth - 20) / 2), 96)
  }

  return Math.max(Math.floor(containerWidth * 0.32), 120)
}

export const calculateModelListDerivedState = ({
  models,
  searchText,
  selectedGroup,
  modelStatuses,
  containerWidth
}: ModelListViewModelInput): ModelListDerivedState => {
  const filteredModels = applyModelFilters(models, searchText, selectedGroup)
  const enabledModelCount = filteredModels.filter((model) => model.isEnabled).length

  return {
    filteredModels,
    sections: {
      enabled: groupModels(filteredModels.filter((model) => model.isEnabled)),
      disabled: groupModels(filteredModels.filter((model) => !model.isEnabled))
    },
    categoryOptions: getCategoryOptions(models),
    categoryModelCounts: getCategoryModelCounts(models),
    duplicateModelNames: getDuplicateProviderSettingModelNames(models),
    enabledModelCount,
    disabledModelCount: filteredModels.length - enabledModelCount,
    modelCount: filteredModels.length,
    hasVisibleModels: filteredModels.length > 0,
    hasNoModels: models.length === 0,
    allEnabled: filteredModels.length > 0 && filteredModels.every((model) => model.isEnabled),
    isCompact: containerWidth > 0 && containerWidth < 920,
    isUltraCompact: containerWidth > 0 && containerWidth < 760,
    chipMaxWidth: getChipMaxWidth(containerWidth),
    modelStatusMap: new Map(modelStatuses.map((status) => [status.model.id, status]))
  }
}
