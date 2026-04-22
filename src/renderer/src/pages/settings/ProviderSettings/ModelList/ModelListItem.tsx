import { Avatar, AvatarFallback, Button, RowFlex, Tooltip } from '@cherrystudio/ui'
import { showErrorDetailPopup } from '@renderer/components/ErrorDetailModal'
import { type HealthResult, HealthStatusIndicator } from '@renderer/components/HealthStatusIndicator'
import { getModelLogo } from '@renderer/config/models/v2'
import type { ModelWithStatus } from '@renderer/types/healthCheck'
import { HealthStatus } from '@renderer/types/healthCheck'
import { maskApiKey } from '@renderer/utils/api'
import type { Model } from '@shared/data/types/model'
import { Bolt, Minus } from 'lucide-react'
import React, { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { FreeTrialModelTagV2 } from '../components/FreeTrialModelTagV2'
import ModelIdWithTagsV2 from '../components/ModelIdWithTagsV2'

interface ModelListItemProps {
  ref?: React.RefObject<HTMLDivElement>
  model: Model
  modelStatus: ModelWithStatus | undefined
  showIdentifier?: boolean
  disabled?: boolean
  onEdit: (model: Model) => void
  onRemove: (model: Model) => void
}

const ModelListItem: React.FC<ModelListItemProps> = ({
  ref,
  model,
  modelStatus,
  showIdentifier = false,
  disabled,
  onEdit,
  onRemove
}) => {
  const { t } = useTranslation()
  const isChecking = modelStatus?.checking === true

  const healthResults = useMemo(
    () =>
      modelStatus?.keyResults?.map((keyResult) => ({
        status: keyResult.status,
        latency: keyResult.latency,
        error: keyResult.error,
        label: maskApiKey(keyResult.key)
      })) || [],
    [modelStatus?.keyResults]
  )

  const hasFailedResult = useMemo(
    () => healthResults.some((result) => result.status === HealthStatus.FAILED),
    [healthResults]
  )

  const handleErrorClick = useMemo(() => {
    if (!hasFailedResult) {
      return undefined
    }

    return (result: HealthResult) => {
      if (result.error) {
        showErrorDetailPopup({ error: result.error })
      }
    }
  }, [hasFailedResult])

  const handleEdit = useCallback(() => {
    onEdit(model)
  }, [model, onEdit])

  const handleRemove = useCallback(() => {
    onRemove(model)
  }, [model, onRemove])

  return (
    <div ref={ref} className="flex items-center gap-2 px-3 py-[6px] text-(--color-text) leading-none">
      <RowFlex className="flex-1 items-center gap-2">
        {(() => {
          const Icon = getModelLogo(model)
          return Icon ? (
            <Icon.Avatar size={20} />
          ) : (
            <Avatar className="h-5 w-5">
              <AvatarFallback>{model.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          )
        })()}
        <ModelIdWithTagsV2
          model={model}
          fontSize={13}
          showIdentifier={showIdentifier}
          style={{
            flex: 1,
            width: 0,
            overflow: 'hidden'
          }}
        />
        <FreeTrialModelTagV2 modelId={model.id} providerId={model.providerId} />
      </RowFlex>
      <RowFlex className="items-center gap-1">
        <HealthStatusIndicator
          results={healthResults}
          loading={isChecking}
          showLatency
          onErrorClick={handleErrorClick}
        />
        <RowFlex className="items-center">
          <Tooltip content={t('models.edit')}>
            <Button
              variant="ghost"
              onClick={handleEdit}
              disabled={disabled}
              size="icon-sm"
              className="size-7 rounded-3xs border border-border/40 bg-transparent text-muted-foreground/70 shadow-none hover:bg-accent/40 hover:text-foreground">
              <Bolt size={12} />
            </Button>
          </Tooltip>
          <Tooltip content={t('settings.models.manage.remove_model')}>
            <Button
              variant="ghost"
              onClick={handleRemove}
              disabled={disabled}
              size="icon-sm"
              className="size-7 rounded-3xs border border-border/40 bg-transparent text-muted-foreground/70 shadow-none hover:bg-accent/40 hover:text-foreground">
              <Minus size={12} />
            </Button>
          </Tooltip>
        </RowFlex>
      </RowFlex>
    </div>
  )
}

export default memo(ModelListItem)
