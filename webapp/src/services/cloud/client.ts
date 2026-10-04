import type { Auth } from 'firebase/auth'
import type { FirebaseStorage } from 'firebase/storage'
import { firebaseConfig } from './config'

export interface CloudSdk {
  auth: Auth
  storage: FirebaseStorage
}

let sdkPromise: Promise<CloudSdk> | null = null

/**
 * The Firebase SDK is only fetched the first time someone actually signs in, so
 * visitors who never touch cloud sync never download it.
 */
export function loadCloudSdk(): Promise<CloudSdk> {
  sdkPromise ??= (async () => {
    const [appSdk, authSdk, storageSdk] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/storage'),
    ])

    const app = appSdk.getApps().length
      ? appSdk.getApp()
      : appSdk.initializeApp(firebaseConfig)

    return { auth: authSdk.getAuth(app), storage: storageSdk.getStorage(app) }
  })()

  return sdkPromise
}