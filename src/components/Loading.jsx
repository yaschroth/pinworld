import './Loading.css'

function Loading({ message = 'Loading...' }) {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>{message}</p>
      </div>
    </div>
  )
}

export default Loading
