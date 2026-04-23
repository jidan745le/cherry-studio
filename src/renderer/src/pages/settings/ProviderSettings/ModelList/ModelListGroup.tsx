import { Flex } from '@cherrystudio/ui'
import CustomCollapse from '@renderer/components/CustomCollapse'
import { DynamicVirtualList, type DynamicVirtualListRef } from '@renderer/components/VirtualList'
import type { ModelWithStatus } from '@renderer/types/healthCheck'
import type { Model } from '@shared/data/types/model'
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
  onToggleModel: (model: Model, enabled: boolean) => Promise<void>
}

const ModelListGroup: React.FC<ModelListGroupProps> = ({
  groupName,
  models,
  duplicateModelNames,
  modelStatusMap,
  defaultOpen,
  disabled,
  onEditModel,
  onToggleModel
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
    <div className={modelListClasses.groupShell}>
      <CustomCollapse
        defaultActiveKey={defaultOpen ? ['1'] : []}
        onChange={handleCollapseChange}
        label={
          <Flex className={modelListClasses.groupHeaderLabel}>
            <span className={modelListClasses.groupTitle}>{groupLabel}</span>
            <span className={modelListClasses.groupHeaderRule} />
            <span className={modelListClasses.groupCount}>{models.length}</span>
          </Flex>
        }
        extra={null}
        styles={{
          header: {
            padding:
              'var(--space-stack-2xs) calc(var(--padding-x-list-group) - 2px) var(--space-stack-2xs) var(--padding-x-list-group)',
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
            padding: '2px 6px 2px 12px',
            scrollbarGutter: 'stable'
          }}
          itemContainerStyle={{
            padding: '2px 0'
          }}>
          {(model) => (
            <ModelListItem
              model={model}
              modelStatus={modelStatusMap.get(model.id)}
              showIdentifier={duplicateModelNames.has(model.name)}
              onEdit={onEditModel}
              onToggleEnabled={onToggleModel}
              disabled={disabled}
            />
          )}
        </DynamicVirtualList>
      </CustomCollapse>
    </div>
  )
}

export default memo(ModelListGroup)
