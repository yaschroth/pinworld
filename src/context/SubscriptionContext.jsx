import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const SubscriptionContext = createContext(null)

export function SubscriptionProvider({ children }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState({
    tier: 'free',
    status: 'active',
    currentUsage: 0,
    monthlyLimit: 5,
    isLoading: true
  })

  useEffect(() => {
    if (user) {
      fetchSubscriptionData()
    } else {
      setSubscription({
        tier: 'free',
        status: 'active',
        currentUsage: 0,
        monthlyLimit: 5,
        isLoading: false
      })
    }
  }, [user])

  const fetchSubscriptionData = async () => {
    try {
      // Fetch usage info using the database function
      const { data: usageData, error: usageError } = await supabase
        .rpc('can_user_extract', { p_user_id: user.id })
        .single()

      if (usageError) {
        console.error('Error fetching usage:', usageError)
        setSubscription(prev => ({ ...prev, isLoading: false }))
        return
      }

      setSubscription({
        tier: usageData?.tier || 'free',
        status: 'active',
        currentUsage: usageData?.current_count || 0,
        monthlyLimit: usageData?.monthly_limit || 5,
        canExtract: usageData?.can_extract ?? true,
        isLoading: false
      })
    } catch (error) {
      console.error('Subscription fetch error:', error)
      setSubscription(prev => ({ ...prev, isLoading: false }))
    }
  }

  const refetch = () => {
    if (user) {
      fetchSubscriptionData()
    }
  }

  const value = {
    ...subscription,
    refetch
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider')
  }
  return context
}
