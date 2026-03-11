import './UpgradePrompt.css'

function UpgradePrompt({ isOpen, onClose, onUpgrade, isLoading }) {
  if (!isOpen) return null

  return (
    <div className="upgrade-overlay" onClick={onClose}>
      <div className="upgrade-modal" onClick={e => e.stopPropagation()}>
        <button className="upgrade-close" onClick={onClose}>
          &times;
        </button>

        <div className="upgrade-content">
          <div className="upgrade-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h2>Monthly Limit Reached</h2>
          <p>You've used all 5 free AI extractions this month.</p>

          <div className="upgrade-plan">
            <h3>Upgrade to Pro</h3>
            <div className="upgrade-price">
              <span className="price">$5</span>
              <span className="period">/month</span>
            </div>

            <ul className="upgrade-benefits">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Unlimited AI location extractions
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Priority support
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Cancel anytime
              </li>
            </ul>

            <button
              className="btn-upgrade-main"
              onClick={onUpgrade}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Upgrade Now'}
            </button>
          </div>

          <p className="upgrade-skip">
            Or continue with manual location entry
          </p>
        </div>
      </div>
    </div>
  )
}

export default UpgradePrompt
