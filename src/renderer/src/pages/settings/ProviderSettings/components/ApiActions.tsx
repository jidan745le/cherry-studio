import { Button } from '@cherrystudio/ui'
import { cn } from '@renderer/utils'
import { Activity, KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { actionClasses } from './ProviderSettingsPrimitives'

interface ApiActionsProps {
  showApiKeyListButton: boolean
  onCheckConnection: () => void
  onOpenApiKeyList: () => void
}

export default function ApiActions({ showApiKeyListButton, onCheckConnection, onOpenApiKeyList }: ApiActionsProps) {
  const { t } = useTranslation()

  return (
    <div className={actionClasses.row}>
      <Button
        variant="outline"
        size="sm"
        className={cn(actionClasses.btnBase, actionClasses.btnNeutral)}
        onClick={() => void onCheckConnection()}>
        <Activity className={actionClasses.icon} />
        {t('settings.provider.check')}
      </Button>
      {showApiKeyListButton && (
        <Button
          variant="outline"
          size="sm"
          className={cn(actionClasses.btnBase, actionClasses.btnNeutral)}
          onClick={() => void onOpenApiKeyList()}>
          <KeyRound className={actionClasses.icon} />
          {t('settings.provider.api.key.list.title')}
        </Button>
      )}
    </div>
  )
}
