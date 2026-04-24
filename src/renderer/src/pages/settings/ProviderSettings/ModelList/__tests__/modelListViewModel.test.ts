import type { ModelWithStatus } from '@renderer/types/healthCheck'
import { HealthStatus } from '@renderer/types/healthCheck'
import { describe, expect, it } from 'vitest'

import {
  applyModelFilters,
  calculateModelListDerivedState,
  calculateModelSections,
  countModelsInGroups
} from '../modelListViewModel'

const models = [
  { id: 'openai::model-zeta', name: 'Zeta', providerId: 'openai', group: 'chat', isEnabled: true },
  { id: 'openai::model-alpha', name: 'Alpha', providerId: 'openai', group: 'embedding', isEnabled: false },
  { id: 'openai::model-beta', name: 'Alpha', providerId: 'openai', group: undefined, isEnabled: true }
] as any[]

describe('modelListViewModel', () => {
  it('groups filtered models into sorted enabled and disabled sections', () => {
    const sections = calculateModelSections(models as any, '', 'all')

    expect(Object.keys(sections.enabled)).toEqual(['__ungrouped__', 'chat'])
    expect(Object.keys(sections.disabled)).toEqual(['embedding'])
    expect(countModelsInGroups(sections.enabled)).toBe(2)
    expect(countModelsInGroups(sections.disabled)).toBe(1)
  })

  it('applies search text and selected group filters together', () => {
    expect(applyModelFilters(models as any, 'alpha', 'all').map((model) => model.id)).toEqual([
      'openai::model-alpha',
      'openai::model-beta'
    ])
    expect(applyModelFilters(models as any, 'alpha', '__ungrouped__').map((model) => model.id)).toEqual([
      'openai::model-beta'
    ])
  })

  it('derives counts, booleans, layout thresholds and status map', () => {
    const modelStatuses: ModelWithStatus[] = [
      {
        model: models[0] as any,
        status: HealthStatus.SUCCESS,
        keyResults: [],
        latency: 120
      }
    ]

    const derivedState = calculateModelListDerivedState({
      models: models as any,
      searchText: '',
      selectedGroup: 'all',
      modelStatuses,
      containerWidth: 700
    })

    expect(derivedState.enabledModelCount).toBe(2)
    expect(derivedState.disabledModelCount).toBe(1)
    expect(derivedState.modelCount).toBe(3)
    expect(derivedState.hasVisibleModels).toBe(true)
    expect(derivedState.hasNoModels).toBe(false)
    expect(derivedState.allEnabled).toBe(false)
    expect(derivedState.isCompact).toBe(true)
    expect(derivedState.isUltraCompact).toBe(true)
    expect(derivedState.chipMaxWidth).toBe(340)
    expect(derivedState.categoryOptions).toEqual(['all', '__ungrouped__', 'chat', 'embedding'])
    expect(derivedState.categoryModelCounts).toEqual({
      all: 3,
      __ungrouped__: 1,
      chat: 1,
      embedding: 1
    })
    expect(derivedState.duplicateModelNames.has('Alpha')).toBe(true)
    expect(derivedState.modelStatusMap.get('openai::model-zeta')).toEqual(modelStatuses[0])
  })

  it('derives empty state and wide layout values without visible models', () => {
    const derivedState = calculateModelListDerivedState({
      models: [],
      searchText: 'missing',
      selectedGroup: 'all',
      modelStatuses: [],
      containerWidth: 980
    })

    expect(derivedState.hasNoModels).toBe(true)
    expect(derivedState.hasVisibleModels).toBe(false)
    expect(derivedState.modelCount).toBe(0)
    expect(derivedState.allEnabled).toBe(false)
    expect(derivedState.isCompact).toBe(false)
    expect(derivedState.isUltraCompact).toBe(false)
    expect(derivedState.chipMaxWidth).toBe(313)
    expect(derivedState.categoryOptions).toEqual(['all'])
    expect(derivedState.categoryModelCounts).toEqual({ all: 0 })
  })
})
