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
import { modelListClasses } from '../components/ProviderSettingsPrimitives'

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

  const metaLine = useMemo(() => {
    const parts: string[] = []

    if (model.description) {
      parts.push(model.description)
    }

    if (model.pricing?.input?.perMillionTokens != null) {
      parts.push(`Input $${model.pricing.input.perMillionTokens.toFixed(2)}/M`)
    }

    if (model.pricing?.output?.perMillionTokens != null) {
      parts.push(`Output $${model.pricing.output.perMillionTokens.toFixed(2)}/M`)
    }

    if (model.contextWindow) {
      const contextLabel =
        model.contextWindow >= 1_000_000
          ? `${Math.round(model.contextWindow / 1_000_000)}M`
          : model.contextWindow >= 1_000
            ? `${Math.round(model.contextWindow / 1_000)}K`
            : `${model.contextWindow}`
      parts.push(contextLabel)
    }

    return parts.join(' · ')
  }, [
    model.contextWindow,
    model.description,
    model.pricing?.input?.perMillionTokens,
    model.pricing?.output?.perMillionTokens
  ])

  return (
    <div ref={ref} className={modelListClasses.row}>
      <RowFlex className="flex-1 items-start gap-3">
        {(() => {
          const Icon = getModelLogo(model)
          return Icon ? (
            <Icon.Avatar size={26} />
          ) : (
            <Avatar className="h-[26px] w-[26px]">
              <AvatarFallback>{model.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          )
        })()}
        <div className="min-w-0 flex-1">
          <ModelIdWithTagsV2
            model={model}
            fontSize="var(--font-size-row-title)"
            showIdentifier={showIdentifier}
            style={{
              width: '100%',
              overflow: 'hidden'
            }}
          />
          {metaLine && <div className={modelListClasses.rowMeta}>{metaLine}</div>}
          <div className="mt-1">
            <FreeTrialModelTagV2 modelId={model.id} providerId={model.providerId} />
          </div>
        </div>
      </RowFlex>
      <RowFlex className="items-center gap-1.5">
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
              className={modelListClasses.rowIconButton}>
              <Bolt className={modelListClasses.toolbarIcon} />
            </Button>
          </Tooltip>
          <Tooltip content={t('settings.models.manage.remove_model')}>
            <Button
              variant="ghost"
              onClick={handleRemove}
              disabled={disabled}
              size="icon-sm"
              className={modelListClasses.rowIconButton}>
              <Minus className={modelListClasses.toolbarIcon} />
            </Button>
          </Tooltip>
        </RowFlex>
      </RowFlex>
    </div>
  )
}

export default memo(ModelListItem)
