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
        <span className="navbar-logo">
          <img src={logo} alt="SanBorja58 Limatambo" />
        </span>
        <span className="navbar-text">
          <span className="navbar-name">
            <span><span className="san">San</span>Borja</span>
            <span className="num">58</span>
          </span>
          <span className="navbar-sub">LIMATAMBO</span>
        </span>
      </Link>
      <div className="navbar-actions">
        {isAdmin && (
          <Link to="/admin">
            <button className="btn btn-sm btn-admin">
              Admin
            </button>
          </Link>
        )}
        {user ? (
          <div className="navbar-user">
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="navbar-avatar"
            />
            <button
              className="btn btn-sm btn-logout"
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
