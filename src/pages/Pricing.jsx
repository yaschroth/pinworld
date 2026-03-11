import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../context/SubscriptionContext'
import { supabase } from '../lib/supabase'
import './Pricing.css'

// This will be set after you create the product in Stripe
const STRIPE_PRO_PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID || 'price_XXXXX'

function Pricing() {
  const { user } = useAuth()
  const { tier, refetch } = useSubscription()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleUpgrade = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId: STRIPE_PRO_PRICE_ID }
      })

      if (fnError) throw fnError

      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError('Failed to start checkout. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Check for success/cancel query params
  const params = new URLSearchParams(window.location.search)
  const canceled = params.get('canceled')

  return (
    <div className="pricing-page">
      <Link to="/" className="back-link">&larr; Back to Map</Link>

      <div className="pricing-header">
        <h1>Choose Your Plan</h1>
        <p>Get more from PinWorld with Pro</p>
      </div>

      {canceled && (
        <div className="pricing-notice">
          Checkout was canceled. You can try again when ready.
        </div>
      )}

      {error && (
        <div className="pricing-error">{error}</div>
      )}

      <div className="pricing-grid">
        {/* Free Plan */}
        <div className={`pricing-card ${tier === 'free' ? 'current' : ''}`}>
          <div className="plan-header">
            <h2>Free</h2>
            <div className="plan-price">
              <span className="price">$0</span>
              <span className="period">/month</span>
            </div>
          </div>

          <ul className="plan-features">
            <li>
              <span className="feature-check">&#10003;</span>
              5 AI extractions per month
            </li>
            <li>
              <span className="feature-check">&#10003;</span>
              Unlimited pins
            </li>
            <li>
              <span className="feature-check">&#10003;</span>
              Map visualization
            </li>
            <li>
              <span className="feature-check">&#10003;</span>
              Manual location entry
            </li>
          </ul>

          {tier === 'free' && (
            <div className="current-plan-badge">Current Plan</div>
          )}
        </div>

        {/* Pro Plan */}
        <div className={`pricing-card featured ${tier === 'pro' ? 'current' : ''}`}>
          <div className="featured-badge">MOST POPULAR</div>

          <div className="plan-header">
            <h2>Pro</h2>
            <div className="plan-price">
              <span className="price">$5</span>
              <span className="period">/month</span>
            </div>
          </div>

          <ul className="plan-features">
            <li>
              <span className="feature-check">&#10003;</span>
              <strong>Unlimited</strong> AI extractions
            </li>
            <li>
              <span className="feature-check">&#10003;</span>
              Unlimited pins
            </li>
            <li>
              <span className="feature-check">&#10003;</span>
              Map visualization
            </li>
            <li>
              <span className="feature-check">&#10003;</span>
              Priority support
            </li>
            <li>
              <span className="feature-check">&#10003;</span>
              Cancel anytime
            </li>
          </ul>

          {tier === 'pro' ? (
            <div className="current-plan-badge">Current Plan</div>
          ) : (
            <button
              className="btn-upgrade"
              onClick={handleUpgrade}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Upgrade to Pro'}
            </button>
          )}
        </div>
      </div>

      <div className="pricing-faq">
        <h3>Questions?</h3>
        <div className="faq-item">
          <strong>What counts as an extraction?</strong>
          <p>Each time you paste a URL and we use AI to detect the location, that's one extraction.</p>
        </div>
        <div className="faq-item">
          <strong>Can I still add pins without AI?</strong>
          <p>Yes! You can always manually type in locations. AI extractions are optional.</p>
        </div>
        <div className="faq-item">
          <strong>When does my limit reset?</strong>
          <p>Your free extractions reset at the beginning of each calendar month.</p>
        </div>
      </div>
    </div>
  )
}

export default Pricing
