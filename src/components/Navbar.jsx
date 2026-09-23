import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <img src={logo} alt="SanBorja58 Limatambo" />
        <span>
          <span style={{ color: '#6abf4b' }}>San</span>
          <span style={{ color: '#1d5c2e' }}>Borja</span>
          <span style={{ color: '#4a90d9' }}>58</span>
        </span>
      </Link>
      <div className="navbar-actions">
        {isAdmin && (
          <Link to="/admin">
            <button className="btn btn-sm btn-primary">
              ⚙️ Admin
            </button>
          </Link>
        )}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src={user.photoURL}
              alt={user.displayName}
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid #6abf4b' }}
            />
            <button
              className="btn btn-sm btn-secondary"
              onClick={handleLogout}
            >
              Salir
            </button>
          </div>
        ) : null}
      </div>
    </nav>
  )
}
