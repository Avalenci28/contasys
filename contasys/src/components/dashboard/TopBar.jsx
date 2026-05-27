import { useEffect, useState } from 'react'
import styles from './TopBar.module.css'
import NotificationsPanel from './NotificationsPanel'

export default function TopBar({ title, onSearch }) {
  const [now, setNow] = useState(() => new Date())




  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className={styles.topbar}>

      <div className={styles.left}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.date}>{now.toLocaleString()}</div>
      </div>

      <div className={styles.right}>
        <NotificationsPanel />
        <input
          className={styles.search}
          placeholder="Buscar..."
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>

    </header>
  )
}

