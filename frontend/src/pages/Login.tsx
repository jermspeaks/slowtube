import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authAPI } from '../services/api'

function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // Check if already authenticated
    authAPI.checkSession().then((data) => {
      if (data.authenticated) {
        navigate('/dashboard')
      }
    })
  }, [navigate])

  const handleConnect = () => {
    const authUrl = authAPI.getAuthUrl()
    window.location.href = authUrl
  }

  const error = searchParams.get('error')
  const authSuccess = searchParams.get('auth') === 'success'

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ marginBottom: '20px', textAlign: 'center' }}>
          YouTube Watch Later
        </h1>
        <p style={{ marginBottom: '30px', textAlign: 'center', color: '#666' }}>
          Connect your YouTube account to import your watch later playlist
        </p>
        
        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            Authentication failed. Please try again.
          </div>
        )}

        {authSuccess && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#efe',
            color: '#3c3',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            Successfully connected! Redirecting...
          </div>
        )}

        <button
          onClick={handleConnect}
          style={{
            width: '100%',
            padding: '12px 24px',
            backgroundColor: '#ff0000',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Connect with YouTube
        </button>
      </div>
    </div>
  )
}

export default Login

