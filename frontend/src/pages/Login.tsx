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
    <div className="flex flex-col items-center justify-center min-h-screen p-5 bg-background">
      <div className="max-w-[400px] w-full p-10 bg-card rounded-lg shadow-lg">
        <h1 className="mb-5 text-center">
          YouTube Watch Later
        </h1>
        <p className="mb-8 text-center text-muted-foreground">
          Connect your YouTube account to import your watch later playlist
        </p>
        
        {error && (
          <div className="p-3 mb-5 bg-red-50 text-red-700 rounded text-center">
            Authentication failed. Please try again.
          </div>
        )}

        {authSuccess && (
          <div className="p-3 mb-5 bg-green-50 text-green-700 rounded text-center">
            Successfully connected! Redirecting...
          </div>
        )}

        <button
          onClick={handleConnect}
          className="w-full px-6 py-3 bg-red-600 text-white border-none rounded text-base cursor-pointer font-bold"
        >
          Connect with YouTube
        </button>
      </div>
    </div>
  )
}

export default Login

