import { useState, useEffect } from "react"

// Up to three notices on screen; the oldest goes when a fourth arrives.
const TOAST_LIMIT = 3

let count = 0
function generateId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

const toastStore = {
  state: {
    toasts: [],
  },
  listeners: [],

  getState: () => toastStore.state,

  setState: (nextState) => {
    if (typeof nextState === 'function') {
      toastStore.state = nextState(toastStore.state)
    } else {
      toastStore.state = { ...toastStore.state, ...nextState }
    }

    toastStore.listeners.forEach(listener => listener(toastStore.state))
  },

  subscribe: (listener) => {
    toastStore.listeners.push(listener)
    return () => {
      toastStore.listeners = toastStore.listeners.filter(l => l !== listener)
    }
  }
}

/**
 * Shows a notice: { title, description, variant, duration? }.
 * The time on screen is run by the card's countdown bar (toaster.jsx), which stops while the
 * pointer is on the notice; duration: Infinity keeps it until closed.
 */
export const toast = ({ ...props }) => {
  const id = generateId()

  const update = (props) =>
    toastStore.setState((state) => ({
      ...state,
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, ...props } : t
      ),
    }))

  const dismiss = () => toastStore.setState((state) => ({
    ...state,
    toasts: state.toasts.filter((t) => t.id !== id),
  }))

  toastStore.setState((state) => ({
    ...state,
    toasts: [
      { ...props, id, dismiss },
      ...state.toasts,
    ].slice(0, TOAST_LIMIT),
  }))

  return {
    id,
    dismiss,
    update,
  }
}

export function useToast() {
  const [state, setState] = useState(toastStore.getState())

  useEffect(() => {
    const unsubscribe = toastStore.subscribe((state) => {
      setState(state)
    })

    return unsubscribe
  }, [])

  return {
    toast,
    toasts: state.toasts,
  }
}
