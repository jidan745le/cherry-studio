import EditModelPopup from '@renderer/pages/settings/ProviderSettings/EditModelPopup/EditModelPopup'
import { isNewApiProvider } from '@renderer/utils/provider.v2'
import type { Model } from '@shared/data/types/model'
import { parseUniqueModelId } from '@shared/data/types/model'
import type { Provider } from '@shared/data/types/provider'
import type { TFunction } from 'i18next'
import { useCallback, useState } from 'react'

import AddModelPopup from './AddModelPopup'
import DownloadOVMSModelPopup from './DownloadOVMSModelPopup'
import ManageModelsPopup from './ManageModelsPopup'
import NewApiAddModelPopup from './NewApiAddModelPopup'

type UseModelListActionsInput = {
  provider: Provider | undefined
  providerId: string
  filteredModels: Model[]
  updateModel: (providerId: string, modelId: string, patch: Partial<Model>) => Promise<unknown>
  syncProviderModels: (provider: Provider) => Promise<unknown>
  t: TFunction
}

export const useModelListActions = ({
  provider,
  providerId,
  filteredModels,
  updateModel,
  syncProviderModels,
  t
}: UseModelListActionsInput) => {
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  const handleEditModel = useCallback(
    (model: Model) => {
      if (provider) {
        void EditModelPopup.show({ provider, model })
      }
    },
    [provider]
  )

  const onManageModel = useCallback(() => {
    if (provider) {
      void ManageModelsPopup.show({ providerId })
    }
  }, [provider, providerId])

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

  return {
    handleEditModel,
    onManageModel,
    onRefreshModels,
    onAddModel,
    onDownloadModel,
    updateVisibleModelsEnabledState,
    toggleModelEnabled,
    isBulkUpdating
  }
}
