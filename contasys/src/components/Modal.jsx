import styles from './Modal.module.css'

export default function Modal({
  isOpen,
  title,
  onClose,
  children,
}) {
  if (!isOpen) return null

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Modal'}
      onMouseDown={(e) => {
        // Cerrar solo si se hace click en el fondo
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>
            {title}
          </div>
          <button className={styles.close} type="button" onClick={onClose} aria-label="Cerrar">
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}

