import styles from './Footer.module.css'
import Logo from './Logo'

const LINKS = {
  'Producto':  ['Dashboard', 'Inventario', 'Ventas', 'Reportes', 'Usuarios'],
  'Empresa':   ['Sobre nosotros', 'Equipo', 'Contacto'],
  'Legal':     ['Privacidad', 'Términos de uso', 'Cookies'],
}

export default function Footer({
  onScroll,
}) {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Logo />
            <p className={styles.brandDesc}>
              Sistema contable web para pequeños negocios.<br />
              Desarrollado en Barranquilla, Colombia.
            </p>
          </div>

          <div className={styles.linksGrid}>
            {Object.entries(LINKS).map(([group, items]) => (
              <div key={group} className={styles.linkGroup}>
                <p className={styles.groupTitle}>{group}</p>
                <ul>
                  {items.map((item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className={styles.link}
                        onClick={(e) => {
                          e.preventDefault()
                          const map = {
                            Dashboard: 'demo',
                            Inventario: 'features',
                            Ventas: 'modulos',
                            Reportes: 'stats',
                            Usuarios: 'cta',
                          }

                          const id = map[item]
                          if (id) onScroll?.(id)
                        }}
                      >
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>
            © {new Date().getFullYear()} ContaSys · Universidad de la Costa – CUC · Ingeniería de Sistemas
          </p>
          <p className={styles.copy}>Gestión de Proyectos TI · Grupo 4</p>
        </div>
      </div>
    </footer>
  )
}
