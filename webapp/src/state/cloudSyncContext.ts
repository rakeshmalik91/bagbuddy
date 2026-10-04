import { createContext, useContext } from 'react'

export type SyncStatus =
  | 'local-only'
  | 'connecting'
  | 'choosing'
  | 'syncing'
  | 'synced'
  | 'error'

export interface CloudChoice {
  remoteUpdatedAt: number | null
  localIsEmpty: boolean
}

export interface CloudContextValue {
  userEmail: string | null
  status: SyncStatus
  message: string | null
  lastSyncedAt: number | null
  choice: CloudChoice | null
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  syncNow(): Promise<void>
  useRemoteCopy(): Promise<void>
  overwriteRemote(): Promise<void>
  dismissChoice(): void
}

export const CloudContext = createContext<CloudContextValue | null>(null)

export function useCloud(): CloudContextValue {
  const value = useContext(CloudContext)
  if (!value) {
    throw new Error('useCloud must be called inside <CloudSyncProvider>')
  }
  return value
}