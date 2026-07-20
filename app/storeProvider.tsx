'use client'
import { Provider } from 'react-redux'
import type { ReactNode } from 'react'
import store from '@/store'

export default function StoreProvider({ children }: { children: ReactNode }) {
  // Single shared store instance so the axios interceptors (which import
  // `@/store` directly) dispatch into the same store the UI reads from.
  return <Provider store={store}>{children}</Provider>
}
