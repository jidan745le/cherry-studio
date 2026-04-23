import { useModelMutations, useModels } from '@renderer/hooks/useModels'
import type { CreateModelDto } from '@shared/data/api/schemas/models'
import { MODELS_BATCH_MAX_ITEMS } from '@shared/data/api/schemas/models'
import type { Model, UniqueModelId } from '@shared/data/types/model'
import type { Provider } from '@shared/data/types/provider'
import { useCallback } from 'react'

import { fetchResolvedProviderModels, toCreateModelDto } from '../ModelList/modelSync'

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }
  return chunks
}

export function useProviderModelSync(providerId: string) {
  const { models } = useModels({ providerId })
  const { createModels, isCreating } = useModelMutations()

  const syncProviderModels = useCallback(
    async (provider: Provider): Promise<Model[]> => {
      const resolvedModels = await fetchResolvedProviderModels(providerId, provider)
      if (resolvedModels.length === 0) {
        return []
      }

      const existingModelIds = new Set<UniqueModelId>(models.map((model) => model.id))
      const payload = resolvedModels
        .filter((model) => !existingModelIds.has(model.id))
        .map((model) => toCreateModelDto(providerId, model))

      if (payload.length === 0) {
        return models
      }

      const chunks = chunkArray(payload, MODELS_BATCH_MAX_ITEMS)
      const createdModels: Model[] = []

      for (const chunk of chunks) {
        const created = await createModels(chunk as CreateModelDto[])
        createdModels.push(...created)
      }

      return [...models, ...createdModels]
    },
    [createModels, models, providerId]
  )

  return {
    syncProviderModels,
    isSyncingModels: isCreating
  }
}
