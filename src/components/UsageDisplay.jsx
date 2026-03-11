import { useSubscription } from '../context/SubscriptionContext'
import './UsageDisplay.css'

function UsageDisplay({ onUpgradeClick }) {
  const { tier, currentUsage, monthlyLimit, isLoading } = useSubscription()

  if (isLoading) return null

  // Pro users see unlimited badge
  if (tier === 'pro') {
    return (
      <div className="usage-display usage-pro">
        <span className="usage-badge pro-badge">PRO</span>
        <span className="usage-text">Unlimited extractions</span>
      </div>
    )
  }

  // Free users see usage bar
  const percentage = (currentUsage / monthlyLimit) * 100
  const remaining = monthlyLimit - currentUsage
  const isAtLimit = remaining <= 0
  const isNearLimit = remaining === 1

  return (
    <div className={`usage-display ${isAtLimit ? 'at-limit' : isNearLimit ? 'near-limit' : ''}`}>
      <div className="usage-header">
        <span className="usage-badge free-badge">FREE</span>
        <span className="usage-count">
          {currentUsage}/{monthlyLimit} extractions
        </span>
      </div>
      <div className="usage-bar">
        <div
          className="usage-fill"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isAtLimit && (
        <button className="btn-upgrade-small" onClick={onUpgradeClick}>
          Upgrade to Pro
        </button>
      )}
      {isNearLimit && !isAtLimit && (
        <span className="usage-warning">1 extraction left this month</span>
      )}
    </div>
  )
}

export default UsageDisplay
