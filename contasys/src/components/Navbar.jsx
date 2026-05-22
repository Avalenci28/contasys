import { useState } from 'react'
import styles from './Navbar.module.css'
import Logo from './Logo'

const NAV_LINKS = [
  { label: 'Módulos',    href: '#modulos' },
  { label: 'Reportes',   href: '#stats' },
  { label: 'Inventario', href: '#features' },
  { label: 'Soporte',    href: '#cta' },
]

export default function Navbar({
  onOpenLogin,
  onOpenRegister,
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Navegación principal">
        <Logo />

        <ul className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a href={link.href} className={styles.link} onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <button type="button" className={styles.btnOutline} onClick={onOpenLogin}>
            Iniciar sesión
          </button>
          <button type="button" className={styles.btnPrimary} onClick={onOpenRegister}>
            Comenzar gratis
          </button>
        </div>

        <button
          className={styles.hamburger}
          aria-label="Abrir menú"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span /><span /><span />
        </button>
      </nav>
    </header>
  )
}
