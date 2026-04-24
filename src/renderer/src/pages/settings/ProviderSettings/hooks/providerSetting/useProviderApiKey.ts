import { useProvider, useProviderApiKeys, useProviderMutations } from '@renderer/hooks/useProviders'
import { formatApiKeys, splitApiKeyString } from '@renderer/utils/api'
import type { ApiKeyEntry } from '@shared/data/types/provider'
import { debounce } from 'lodash'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ApiKeysData } from './types'

function getEnabledApiKeyString(apiKeysData: ApiKeysData | undefined) {
  return (
    apiKeysData?.keys
      ?.filter((item) => item.isEnabled)
      .map((item) => item.key)
      .join(',') ?? ''
  )
}

function parseApiKeys(value: string) {
  const seenKeys = new Set<string>()

  return splitApiKeyString(formatApiKeys(value)).filter((key) => {
    if (seenKeys.has(key)) {
      return false
    }

    seenKeys.add(key)
    return true
  })
}

function toEnabledApiKeyString(value: string) {
  return parseApiKeys(value).join(',')
}

function toApiKeyEntries(value: string, apiKeysData: ApiKeysData | undefined): ApiKeyEntry[] {
  const nextEnabledKeys = parseApiKeys(value)
  const existingKeys = apiKeysData?.keys ?? []
  const existingEnabledKeys = existingKeys.filter((item) => item.isEnabled)
  const usedEntryIds = new Set<string>()
  const nextEntries: ApiKeyEntry[] = []
  let enabledCursor = 0

  for (const key of nextEnabledKeys) {
    const matchedEntry = existingKeys.find((item) => !usedEntryIds.has(item.id) && item.key.trim() === key)

    if (matchedEntry) {
      usedEntryIds.add(matchedEntry.id)
      nextEntries.push({ ...matchedEntry, key, isEnabled: true })
      continue
    }

    while (enabledCursor < existingEnabledKeys.length && usedEntryIds.has(existingEnabledKeys[enabledCursor].id)) {
      enabledCursor += 1
    }

    const reusableEnabledEntry = existingEnabledKeys[enabledCursor]
    if (reusableEnabledEntry) {
      usedEntryIds.add(reusableEnabledEntry.id)
      nextEntries.push({ ...reusableEnabledEntry, key, isEnabled: true })
      enabledCursor += 1
      continue
    }

    nextEntries.push({ id: crypto.randomUUID(), key, isEnabled: true })
  }

  const untouchedDisabledEntries = existingKeys.filter((item) => !item.isEnabled && !usedEntryIds.has(item.id))
  return [...nextEntries, ...untouchedDisabledEntries]
}

/**
 * Boundary rule: this is a domain-cohesive hook for the provider API key subdomain.
 * It should internalize provider-local queries, mutations, and input normalization concerns,
 * expose only the minimal UI-facing state/actions for API key editing, and prefer a providerId-only API.
 * Callers should pass only the provider id, never page-assembled domain-local dependencies.
 *
 * Intent: manage the API key input value and its debounced synchronization back to provider settings.
 * Scope: use inside Provider Settings composition code where inline API key editing is rendered.
 * Does not handle: popup orchestration, connection checks, endpoint drafts, or model sync triggers.
 *
 * @example
 * ```tsx
 * const apiKey = useProviderApiKey(providerId)
 * <Input value={apiKey.inputApiKey} onChange={(event) => apiKey.setInputApiKey(event.target.value)} />
 * ```
 */
export function useProviderApiKey(providerId: string) {
  const { provider } = useProvider(providerId)
  const { data: apiKeysData } = useProviderApiKeys(providerId)
  const { updateApiKeys } = useProviderMutations(providerId)

  const serverApiKey = useMemo(() => getEnabledApiKeyString(apiKeysData), [apiKeysData])
  const [inputApiKey, setInputApiKeyValue] = useState(serverApiKey)
  const [expectedServerApiKey, setExpectedServerApiKey] = useState<string | null>(null)

  const normalizedInputApiKey = useMemo(() => toEnabledApiKeyString(inputApiKey), [inputApiKey])
  const hasPendingSync = expectedServerApiKey !== null

  const persistApiKeyDraft = useCallback(
    async (formattedValue: string) => {
      await updateApiKeys(toApiKeyEntries(formattedValue, apiKeysData))
    },
    [apiKeysData, updateApiKeys]
  )

  const setInputApiKey = useCallback(
    (value: string) => {
      const normalizedValue = toEnabledApiKeyString(value)
      setInputApiKeyValue(value)
      setExpectedServerApiKey(normalizedValue === serverApiKey ? null : normalizedValue)
    },
    [serverApiKey]
  )

  const debouncedUpdateApiKey = useMemo(
    () => debounce((formattedValue: string) => void persistApiKeyDraft(formattedValue), 150),
    [persistApiKeyDraft]
  )

  useEffect(() => {
    if (!hasPendingSync) {
      setInputApiKeyValue(serverApiKey)
      return
    }

    if (serverApiKey === expectedServerApiKey) {
      setExpectedServerApiKey(null)
      setInputApiKeyValue(serverApiKey)
    }
  }, [expectedServerApiKey, hasPendingSync, serverApiKey])

  useEffect(() => {
    if (provider && normalizedInputApiKey !== serverApiKey) {
      void debouncedUpdateApiKey(normalizedInputApiKey)
    }

    return () => debouncedUpdateApiKey.cancel()
  }, [debouncedUpdateApiKey, normalizedInputApiKey, provider, serverApiKey])

  const commitInputApiKeyNow = useCallback(async () => {
    debouncedUpdateApiKey.cancel()

    if (!provider || normalizedInputApiKey === serverApiKey) {
      return
    }

    await persistApiKeyDraft(normalizedInputApiKey)
  }, [debouncedUpdateApiKey, normalizedInputApiKey, persistApiKeyDraft, provider, serverApiKey])

  return {
    serverApiKey,
    inputApiKey,
    setInputApiKey,
    hasPendingSync,
    commitInputApiKeyNow
  }
}
