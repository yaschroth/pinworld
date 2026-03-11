import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, options = {}) => {
    const id = ++toastId
    const toast = {
      id,
      message,
      type: options.type || 'info', // 'success', 'error', 'warning', 'info'
      duration: options.duration ?? 4000,
      action: options.action || null
    }

    setToasts(prev => [...prev, toast])

    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((message, options = {}) => {
    return addToast(message, { ...options, type: 'success' })
  }, [addToast])

  const error = useCallback((message, options = {}) => {
    return addToast(message, { ...options, type: 'error' })
  }, [addToast])

  const warning = useCallback((message, options = {}) => {
    return addToast(message, { ...options, type: 'warning' })
  }, [addToast])

  const info = useCallback((message, options = {}) => {
    return addToast(message, { ...options, type: 'info' })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
