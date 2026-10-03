import { normaliseBaggageState } from '../../lib/storage'
import type { BaggageState } from '../../types'
import type { CloudSdk } from './client'
import { STATE_FILE } from './config'

export interface StoredState {
  version: 1
  updatedAt: number
  state: BaggageState
}

export interface RemoteSnapshot {
  state: BaggageState | null
  updatedAt: number | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Storage keys mirror the requested layout: `<email>/state.json`. */
export function statePath(email: string): string {
  return `${email.toLowerCase()}/${STATE_FILE}`
}

/**
 * Reads the account's board directly from Firebase Storage.
 */
export async function loadRemoteState(sdk: CloudSdk, email: string): Promise<RemoteSnapshot> {
  const { ref, getBytes, getMetadata } = await import('firebase/storage')
  const storageRef = ref(sdk.storage, statePath(email))

  let bytes: ArrayBuffer
  let lastModified: string | null

  try {
    const [downloadedBytes, metadata] = await Promise.all([
      getBytes(storageRef),
      getMetadata(storageRef).catch(() => null),
    ])
    bytes = downloadedBytes
    lastModified = metadata?.updated ?? null
  } catch (cause) {
    const code = (cause as { code?: string }).code
    if (code === 'storage/object-not-found') {
      return { state: null, updatedAt: null }
    }
    const detail = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`Could not reach Firebase Storage (${detail}).`, { cause })
  }

  const text = new TextDecoder().decode(bytes)
  return parseBoard(text, lastModified)
}

function parseBoard(text: string, lastModified: string | null): RemoteSnapshot {
  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch (cause) {
    throw new Error('The saved board is not valid JSON.', { cause })
  }

  const stored = isRecord(payload) && typeof payload.updatedAt === 'number' ? payload.updatedAt : null
  const updatedAt = stored ?? (lastModified ? Date.parse(lastModified) || null : null)

  return { state: normaliseBaggageState(isRecord(payload) ? payload.state : null), updatedAt }
}

/**
 * Saves the account's board directly to Firebase Storage.
 */
export async function saveRemoteState(
  sdk: CloudSdk,
  email: string,
  state: BaggageState,
): Promise<number> {
  const updatedAt = Date.now()
  const payload: StoredState = { version: 1, updatedAt, state }
  const body = JSON.stringify(payload)

  // Imported lazily so the Firebase Storage SDK stays out of the initial bundle.
  const { ref, uploadString } = await import('firebase/storage')
  await uploadString(ref(sdk.storage, statePath(email)), body)
  return updatedAt
}