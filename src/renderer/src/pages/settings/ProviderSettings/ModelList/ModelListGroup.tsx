import { Button, Flex, Tooltip } from '@cherrystudio/ui'
import CustomCollapse from '@renderer/components/CustomCollapse'
import { DynamicVirtualList, type DynamicVirtualListRef } from '@renderer/components/VirtualList'
import type { ModelWithStatus } from '@renderer/types/healthCheck'
import type { Model } from '@shared/data/types/model'
import { Minus } from 'lucide-react'
import React, { memo, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { modelListClasses } from '../components/ProviderSettingsPrimitives'
import { getModelGroupLabel } from './grouping'
import ModelListItem from './ModelListItem'

interface ModelListGroupProps {
  groupName: string
  models: Model[]
  duplicateModelNames: Set<string>
  modelStatusMap: Map<string, ModelWithStatus>
  defaultOpen: boolean
  disabled?: boolean
  onEditModel: (model: Model) => void
  onRemoveModel: (model: Model) => void
  onRemoveGroup: () => void
}

const ModelListGroup: React.FC<ModelListGroupProps> = ({
  groupName,
  models,
  duplicateModelNames,
  modelStatusMap,
  defaultOpen,
  disabled,
  onEditModel,
  onRemoveModel,
  onRemoveGroup
}) => {
  const { t } = useTranslation()
  const listRef = useRef<DynamicVirtualListRef>(null)
  const groupLabel = getModelGroupLabel(groupName, t)

  const handleCollapseChange = useCallback((activeKeys: string[] | string) => {
    const isExpanded = Array.isArray(activeKeys) ? activeKeys.length > 0 : Boolean(activeKeys)
    if (isExpanded) {
      requestAnimationFrame(() => listRef.current?.measure())
    }
  }, [])

  return (
    <div className="group [&_.ant-collapse-content-box]:!p-0">
      <CustomCollapse
        defaultActiveKey={defaultOpen ? ['1'] : []}
        onChange={handleCollapseChange}
        label={
          <Flex className="items-center gap-[10px]">
            <span className={modelListClasses.groupTitle}>{groupLabel}</span>
          </Flex>
        }
        extra={
          <Tooltip content={t('settings.models.manage.remove_whole_group')}>
            <Button
              variant="ghost"
              className="opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation()
                onRemoveGroup()
              }}
              disabled={disabled}>
              <Minus size={14} />
            </Button>
          </Tooltip>
        }
        styles={{
          header: {
            padding:
              'var(--padding-y-control) calc(var(--padding-y-control) + var(--scrollbar-width)) var(--padding-y-control) var(--padding-x-list-group)',
            background: 'transparent'
          }
        }}
        style={{
          border: 'none',
          background: 'transparent'
        }}>
        <DynamicVirtualList
          ref={listRef}
          list={models}
          estimateSize={useCallback(() => 52, [])}
          overscan={5}
          scrollerStyle={{
            maxHeight: 'var(--max-height-scroll-sm)',
            padding: '4px 6px 4px 12px',
            scrollbarGutter: 'stable'
          }}
          itemContainerStyle={{
            padding: '4px 0'
          }}>
          {(model) => (
            <ModelListItem
              model={model}
              modelStatus={modelStatusMap.get(model.id)}
              showIdentifier={duplicateModelNames.has(model.name)}
              onEdit={onEditModel}
              onRemove={onRemoveModel}
              disabled={disabled}
            />
          )}
        </DynamicVirtualList>
      </CustomCollapse>
    </div>
  )
}

export default memo(ModelListGroup)
