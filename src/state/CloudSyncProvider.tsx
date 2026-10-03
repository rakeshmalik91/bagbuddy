import type { User } from 'firebase/auth'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadCloudSdk } from '../services/cloud/client'
import type { CloudSdk } from '../services/cloud/client'
import { loadRemoteState, saveRemoteState } from '../services/cloud/repository'
import type { BaggageState } from '../types'
import { isStateEmpty } from './baggageReducer'
import { CloudContext } from './cloudSyncContext'
import type { CloudChoice, SyncStatus } from './cloudSyncContext'
import { useBaggage } from './baggageContext'

const SYNC_DEBOUNCE_MS = 1200

function describeAuthError(cause: unknown): string {
  const code = (cause as { code?: string }).code ?? ''
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'That email and password combination was not accepted.'
  }
  if (code === 'auth/invalid-email') return 'That does not look like an email address.'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Wait a moment and try again.'
  if (code === 'auth/network-request-failed') return 'Could not reach Firebase. Check your connection.'
  return cause instanceof Error ? cause.message : 'Sign in failed.'
}

function describeStorageError(cause: unknown): string {
  const code = (cause as { code?: string }).code ?? ''
  if (code === 'storage/unauthorized') {
    return 'Firebase Storage rejected this. The bucket security rules need to allow your signed-in account.'
  }
  if (code === 'storage/quota-exceeded') return 'The Firebase Storage quota is used up.'
  return cause instanceof Error ? cause.message : 'Cloud sync failed.'
}

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useBaggage()

  const [sdk, setSdk] = useState<CloudSdk | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<SyncStatus>('local-only')
  const [message, setMessage] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [choice, setChoice] = useState<CloudChoice | null>(null)
  const [remoteCopy, setRemoteCopy] = useState<BaggageState | null>(null)
  const [syncEnabled, setSyncEnabled] = useState(false)

  const queueRef = useRef<Promise<boolean>>(Promise.resolve(true))
  const connectHandledRef = useRef(false)
  // Once we know what is in the cloud, an empty local board is a deliberate
  // state rather than a failed download, so the guard can be relaxed.
  const knowsRemoteRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    void (async () => {
      try {
        const loaded = await loadCloudSdk()
        if (cancelled) return
        setSdk(loaded)
        unsubscribe = loaded.auth.onAuthStateChanged((nextUser) => {
          setUser(nextUser)
          if (nextUser) return
          connectHandledRef.current = false
          knowsRemoteRef.current = false
          setSyncEnabled(false)
          setStatus('local-only')
          setLastSyncedAt(null)
          setChoice(null)
          setRemoteCopy(null)
        })
      } catch (cause) {
        if (!cancelled) {
          setStatus('error')
          setMessage(describeAuthError(cause))
        }
      }
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  const upload = useCallback(
    async (email: string, target: CloudSdk, payload: BaggageState): Promise<boolean> => {
      setStatus('syncing')
      try {
        const savedAt = await saveRemoteState(target, email, payload)
        setLastSyncedAt(savedAt)
        setStatus('synced')
        setMessage(null)
        return true
      } catch (cause) {
        setStatus('error')
        setMessage(describeStorageError(cause))
        return false
      }
    },
    [],
  )

  // Uploads are serialised so a burst of edits cannot land out of order.
  const enqueue = useCallback((job: () => Promise<boolean>): Promise<boolean> => {
    const next = queueRef.current.then(job, job)
    queueRef.current = next.catch(() => false)
    return next
  }, [])

  const push = useCallback((): Promise<boolean> => {
    const email = user?.email
    const target = sdk
    if (!email || !target) return Promise.resolve(false)

    // A failed download leaves an empty board on screen, and uploading that would
    // wipe the saved copy. Make the user say so first.
    if (isStateEmpty(state) && !knowsRemoteRef.current) {
      const confirmed = window.confirm(
        `This board is empty. Uploading will replace the copy saved in the cloud for ${email}. Continue?`,
      )
      if (!confirmed) {
        setStatus('error')
        setMessage('Upload cancelled, so the saved copy was left alone.')
        return Promise.resolve(false)
      }
    }

    return enqueue(() => upload(email, target, state))
  }, [enqueue, sdk, state, upload, user?.email])

  /**
   * Runs once per signed-in session, however it started: a fresh sign-in, or a
   * page reload that restored the Firebase session. Without it, reloading the
   * page while signed in would show an empty board and never fetch the cloud copy.
   */
  const connect = useCallback(
    async (email: string, target: CloudSdk, localState: BaggageState) => {
      let snapshot: Awaited<ReturnType<typeof loadRemoteState>>
      try {
        snapshot = await loadRemoteState(target, email)
      } catch (cause) {
        setStatus('error')
        setMessage(describeStorageError(cause))
        return
      }

      if (snapshot.state) {
        knowsRemoteRef.current = true

        // Nothing on this device to lose, so the cloud copy simply wins.
        if (isStateEmpty(localState)) {
          dispatch({ type: 'state/reset', state: snapshot.state })
          setSyncEnabled(true)
          setLastSyncedAt(snapshot.updatedAt)
          setStatus('synced')
          return
        }

        // The normal case: this device already has the saved copy, because it
        // was restored from it last time. There is nothing to decide, so do not
        // ask. Only a genuine divergence is worth a question.
        if (JSON.stringify(localState) === JSON.stringify(snapshot.state)) {
          setSyncEnabled(true)
          setLastSyncedAt(snapshot.updatedAt)
          setStatus('synced')
          return
        }

        setRemoteCopy(snapshot.state)
        setChoice({ remoteUpdatedAt: snapshot.updatedAt, localIsEmpty: false })
        setStatus('choosing')
        return
      }

      setSyncEnabled(true)
      await enqueue(() => upload(email, target, localState))
    },
    [dispatch, enqueue, upload],
  )

  useEffect(() => {
    if (!user?.email || !sdk || connectHandledRef.current) return
    connectHandledRef.current = true
    void connect(user.email, sdk, state)
  }, [connect, sdk, state, user?.email])

  const signIn = useCallback(
    async (email: string, password: string) => {
      setStatus('connecting')
      setMessage(null)
      try {
        const { signInWithEmailAndPassword } = await import('firebase/auth')
        const loaded = sdk ?? (await loadCloudSdk())
        if (sdk !== loaded) setSdk(loaded)
        await signInWithEmailAndPassword(loaded.auth, email.trim(), password)
      } catch (cause) {
        setStatus('error')
        setMessage(describeAuthError(cause))
      }
    },
    [sdk],
  )

  const signOut = useCallback(async () => {
    if (!sdk) return
    setSyncEnabled(false)
    setChoice(null)
    setRemoteCopy(null)
    setLastSyncedAt(null)
    try {
      await sdk.auth.signOut()
    } catch (cause) {
      setMessage(describeAuthError(cause))
    }
  }, [sdk])

  const syncNow = useCallback(async () => {
    if (!user?.email || !sdk) {
      setStatus('error')
      setMessage('Sign in first to sync.')
      return
    }
    await push()
  }, [push, sdk, user?.email])

  const useRemoteCopy = useCallback(async () => {
    if (remoteCopy) dispatch({ type: 'state/reset', state: remoteCopy })
    setChoice(null)
    setRemoteCopy(null)
    setSyncEnabled(true)
    await push()
  }, [dispatch, push, remoteCopy])

  const overwriteRemote = useCallback(async () => {
    setChoice(null)
    setSyncEnabled(true)
    await push()
  }, [push])

  const dismissChoice = useCallback(() => {
    setChoice(null)
    setRemoteCopy(null)
    setSyncEnabled(false)
    setStatus('local-only')
  }, [])

  useEffect(() => {
    if (!syncEnabled || !user?.email) return
    const timer = window.setTimeout(() => {
      void push()
    }, SYNC_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [push, state, syncEnabled, user?.email])

  const value = useMemo(
    () => ({
      userEmail: user?.email ?? null,
      status,
      message,
      lastSyncedAt,
      choice,
      signIn,
      signOut,
      syncNow,
      useRemoteCopy,
      overwriteRemote,
      dismissChoice,
    }),
    [
      choice,
      dismissChoice,
      lastSyncedAt,
      message,
      overwriteRemote,
      signIn,
      signOut,
      status,
      syncNow,
      useRemoteCopy,
      user?.email,
    ],
  )

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>
}