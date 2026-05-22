import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import styles from './DashboardPreview.module.css'

const salesData = [
  { day: 'Lun', ventas: 1200000 },
  { day: 'Mar', ventas: 1850000 },
  { day: 'Mié', ventas: 1400000 },
  { day: 'Jue', ventas: 2300000 },
  { day: 'Vie', ventas: 1900000 },
  { day: 'Sáb', ventas: 2800000 },
  { day: 'Dom', ventas: 2100000 },
]

const recentSales = [
  { product: 'Arroz Diana x50kg',  amount: '$320.000', qty: 14 },
  { product: 'Aceite Palomino x3L', amount: '$180.000', qty: 8  },
  { product: 'Harina de trigo x25kg', amount: '$95.000', qty: 5  },
  { product: 'Azúcar Riopaila x50kg', amount: '$74.000', qty: 3  },
]

const metricCards = [
  { label: 'Ventas del mes',   value: '$4.2M',  trend: '+12%', positive: true  },
  { label: 'Productos activos', value: '348',    trend: '+8',   positive: true  },
  { label: 'Stock crítico',     value: '7',      trend: 'Atención', positive: false },
  { label: 'Utilidad neta',     value: '$1.8M',  trend: '+5%',  positive: true  },
]

function formatCOP(value) {
  return `$${(value / 1000000).toFixed(1)}M`
}

export default function DashboardPreview() {
  return (
    <section className={styles.wrapper} id="demo">
      <div className={styles.container}>
        {/* Window chrome */}
        <div className={styles.windowBar}>
          <div className={styles.dots}>
            <span className={`${styles.dot} ${styles.red}`}   />
            <span className={`${styles.dot} ${styles.amber}`} />
            <span className={`${styles.dot} ${styles.green}`} />
          </div>
          <span className={styles.windowTitle}>ContaSys — Dashboard principal</span>
        </div>

        {/* Dashboard body */}
        <div className={styles.dashboard}>
          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <nav aria-label="Menú del sistema">
              {[
                { icon: '▦', label: 'Dashboard', active: true  },
                { icon: '◫', label: 'Inventario', active: false },
                { icon: '◈', label: 'Ventas',     active: false },
                { icon: '◉', label: 'Reportes',   active: false },
                { icon: '◎', label: 'Usuarios',   active: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`${styles.sideItem} ${item.active ? styles.sideItemActive : ''}`}
                >
                  <span className={styles.sideIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className={styles.main}>
            {/* Metric cards */}
            <div className={styles.metricsGrid}>
              {metricCards.map((card) => (
                <div key={card.label} className={styles.metricCard}>
                  <p className={styles.metricLabel}>{card.label}</p>
                  <p className={styles.metricValue}>{card.value}</p>
                  <p className={`${styles.metricTrend} ${card.positive ? styles.positive : styles.negative}`}>
                    {card.positive ? '↑' : '⚠'} {card.trend}
                  </p>
                </div>
              ))}
            </div>

            {/* Chart + list */}
            <div className={styles.bottomGrid}>
              <div className={styles.chartCard}>
                <p className={styles.cardTitle}>Ventas últimos 7 días</p>
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={salesData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#0F6E56" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0F6E56" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6C757D' }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={formatCOP} tick={{ fontSize: 10, fill: '#6C757D' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v) => [formatCOP(v), 'Ventas']}
                      contentStyle={{ fontSize: 12, border: '1px solid #E9ECEF', borderRadius: 8 }}
                    />
                    <Area type="monotone" dataKey="ventas" stroke="#0F6E56" strokeWidth={2} fill="url(#colorVentas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className={styles.listCard}>
                <p className={styles.cardTitle}>Últimas ventas</p>
                {recentSales.map((sale) => (
                  <div key={sale.product} className={styles.listRow}>
                    <span className={styles.listName}>{sale.product}</span>
                    <span className={styles.listAmount}>{sale.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
