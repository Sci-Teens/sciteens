import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'

const AuthContext = createContext({
  status: 'loading',
  user: null,
})

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading',
    user: null,
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) =>
        setState({ status: 'success', user: user ?? null }),
      () => setState({ status: 'error', user: null })
    )
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  )
}

export function useSigninCheck() {
  const { status, user } = useContext(AuthContext)
  return { status, data: { signedIn: !!user, user } }
}

export function useUser() {
  const { status, user } = useContext(AuthContext)
  return { status, data: user }
}
