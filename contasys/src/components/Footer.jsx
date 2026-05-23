import { useState } from 'react'

import styles from './Footer.module.css'
import Logo from './Logo'
import Modal from './Modal'

const LINKS = {
  'Producto':  ['Dashboard', 'Inventario', 'Ventas', 'Reportes', 'Usuarios'],
  'Empresa':   ['Sobre nosotros', 'Equipo', 'Contacto'],
  'Legal':     ['Privacidad', 'Términos de uso', 'Cookies'],
}

export default function Footer({
  onScroll,
}) {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)
  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const [isCookiesOpen, setIsCookiesOpen] = useState(false)

  const closeAnyModal = () => {
    setIsPrivacyOpen(false)
    setIsTermsOpen(false)
    setIsCookiesOpen(false)
  }

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

                          if (group === 'Legal') {
                            if (item === 'Privacidad') setIsPrivacyOpen(true)
                            if (item === 'Términos de uso') setIsTermsOpen(true)
                            if (item === 'Cookies') setIsCookiesOpen(true)
                            return
                          }

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

      <Modal
        isOpen={isPrivacyOpen}
        title="Política de Privacidad de ContaSys"
        onClose={closeAnyModal}
      >
        <div className={styles.modalScroll}>
          <div className={styles.modalSection}>
            <p className={styles.modalSectionTitle}>Qué datos recopilamos</p>
            <p className={styles.modalText}>
              Para operar el servicio contable en ContaSys, recopilamos los datos que ingresas al crear tu cuenta y
              administrar tu información:
            </p>
            <ul className={styles.modalList}>
              <li className={styles.modalListItem}>Nombre y datos de contacto (por ejemplo, email).</li>
              <li className={styles.modalListItem}>Datos de tu empresa o negocio para configurar el servicio.</li>
              <li className={styles.modalListItem}>Información contable que publiques o gestiones dentro de la plataforma.</li>
            </ul>
          </div>

          <div className={styles.modalSection}>
            <p className={styles.modalSectionTitle}>Cómo usamos los datos</p>
            <p className={styles.modalText}>
              Usamos estos datos para proporcionarte el servicio contable web, gestionar tu acceso, habilitar funciones
              del sistema y permitirte operar y administrar la información de tu negocio.
            </p>
          </div>

          <div className={styles.modalSection}>
            <p className={styles.modalSectionTitle}>No compartimos datos con terceros</p>
            <p className={styles.modalText}>
              No vendemos ni compartimos tus datos personales con terceros con fines comerciales. Cuando existe la necesidad
              de soporte técnico, lo hacemos con proveedores que operan bajo controles de seguridad y confidencialidad.
            </p>
          </div>

          <div className={styles.modalSection}>
            <p className={styles.modalSectionTitle}>Supabase como proveedor seguro de base de datos</p>
            <p className={styles.modalText}>
              ContaSys utiliza Supabase como proveedor de infraestructura para la base de datos. Esto permite almacenar y
              gestionar la información de forma segura, con mecanismos de protección y acceso controlado.
            </p>
          </div>

          <div className={styles.modalSection}>
            <p className={styles.modalSectionTitle}>Derecho a eliminar tu cuenta y datos</p>
            <p className={styles.modalText}>
              Tienes derecho a solicitar la eliminación de tu cuenta y/o tus datos. Si deseas ejercer este derecho, contacta
              al equipo de soporte para que podamos ayudarte con el proceso.
            </p>
          </div>

          <div className={styles.modalCloseBtnWrap}>
            <button className={styles.modalCloseBtn} type="button" onClick={closeAnyModal}>
              Cerrar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isTermsOpen}
        title="Términos y Condiciones de ContaSys"
        onClose={closeAnyModal}
      >
        <div className={styles.modalScroll}>
          <div className={styles.modalSection}>
            <p className={styles.modalSectionTitle}>Descripción del servicio</p>
            <p className={styles.modalText}>
              ContaSys es un sistema contable web diseñado para pequeñas empresas. La plataforma te permite registrar,
              organizar y administrar información contable mediante herramientas en línea.
            </p>
          </div>

          <div className={styles.modalSection}>
            <p className={styles.modalSectionTitle}>Responsabilidad del usuario por sus datos</p>
            <p className={styles.modalText}>
              El usuario es responsable de la veracidad, legalidad y calidad de los datos contables que ingrese y/o gestione
              dentro de la plataforma. Cualquier decisión basada en la información registrada es responsabilidad del usuario.
            </p>
          </div>

          <div className={styles.modalSection}>
            <p className={styles.modalSectionTitle}>Uso permitido y prohibido</p>
            <p className={styles.modalText}>
              Aceptas usar la plataforma de manera legítima. Se prohíbe, entre otros:
            </p>
            <ul className={styles.modalList}>
              <li className={styles.modalListItem}>Utilizar la plataforma para actividades ilegales o no autorizadas.</li>
              <li className={styles.modalListItem}>Intentar acceder sin autorización a cuentas, datos o infraestructura.</li>
              <li className={styles.modalListItem}>Interferir con el funcionamiento normal del sistema o afectar su disponibilidad.</li>
              <li className={styles.modalListItem}>Compartir credenciales o permitir accesos no autorizados.</li>
            </ul>
          </div>

          <div className={styles.modalSection}>
            <p className={styles.modalSectionTitle}>Limitación de responsabilidad</p>
            <p className={styles.modalText}>
              En la medida permitida por la ley, ContaSys no será responsable por daños indirectos, pérdida de ingresos o
              perjuicios derivados del uso del servicio. El usuario acepta que los resultados dependen del correcto ingreso
              y manejo de sus datos.
            </p>
          </div>

          <div className={styles.modalSection}>
            <p className={styles.modalSectionTitle}>Actualizaciones del servicio</p>
            <p className={styles.modalText}>
              Podemos actualizar o modificar funcionalidades, mejoras y componentes del sistema con el fin de garantizar su
              evolución y estabilidad. Los cambios se reflejarán en la versión disponible en la plataforma.
            </p>
          </div>

          <div className={styles.modalCloseBtnWrap}>
            <button className={styles.modalCloseBtn} type="button" onClick={closeAnyModal}>
              Cerrar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCookiesOpen}
        title="Política de Cookies"
        onClose={closeAnyModal}
      >
        <div className={styles.modalScroll}>
          <div className={styles.modalSection}>
            <p className={styles.modalSectionTitle}>Cookies de sesión</p>
            <p className={styles.modalText}>
              En ContaSys utilizamos cookies de sesión para mantener la autenticación del usuario. Estas cookies permiten
              que permanezcas conectado y que el sistema pueda identificar tu sesión de forma segura.
            </p>
          </div>

          <div className={styles.modalSection}>
            <p className={styles.modalSectionTitle}>Supabase</p>
            <p className={styles.modalText}>
              El manejo de la autenticación se realiza mediante Supabase, por lo que las cookies de sesión necesarias
              para el funcionamiento del inicio de sesión pueden ser administradas por esa infraestructura.
            </p>
          </div>

          <div className={styles.modalSection}>
            <p className={styles.modalSectionTitle}>No usamos cookies de rastreo publicitario</p>
            <p className={styles.modalText}>
              No usamos cookies de rastreo publicitario ni herramientas de publicidad basada en comportamiento. El objetivo de
              las cookies usadas es exclusivamente técnico para habilitar la sesión y el acceso.
            </p>
          </div>

          <div className={styles.modalSection}>
            <p className={styles.modalSectionTitle}>Cómo desactivarlas desde tu navegador</p>
            <p className={styles.modalText}>
              Puedes desactivar las cookies en la configuración de tu navegador. Ten en cuenta que, si deshabilitas las cookies
              de sesión, podrías tener dificultades para mantener la autenticación y usar la plataforma.
            </p>
          </div>

          <div className={styles.modalCloseBtnWrap}>
            <button className={styles.modalCloseBtn} type="button" onClick={closeAnyModal}>
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    </footer>
  )
}

