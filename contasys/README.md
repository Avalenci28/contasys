# ContaSys — Sistema Contable Web

Sistema contable para pequeños negocios desarrollado con React + Vite.

## Tecnologías

- **React 18** — Biblioteca de interfaz de usuario
- **Vite 5** — Bundler y servidor de desarrollo
- **Recharts** — Gráficas y visualizaciones
- **CSS Modules** — Estilos con scope por componente

## Estructura del proyecto

```
contasys/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Navbar.jsx / .module.css
│   │   ├── Logo.jsx / .module.css
│   │   ├── Hero.jsx / .module.css
│   │   ├── DashboardPreview.jsx / .module.css
│   │   ├── Features.jsx / .module.css
│   │   ├── Modules.jsx / .module.css
│   │   ├── Stats.jsx / .module.css
│   │   ├── CallToAction.jsx / .module.css
│   │   └── Footer.jsx / .module.css
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Instalación y uso

### Prerrequisitos
- Node.js 18 o superior
- npm o yarn

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Abrir en el navegador
# http://localhost:5173
```

### Otros comandos

```bash
# Construir para producción
npm run build

# Previsualizar build de producción
npm run preview
```

## Módulos del sistema

1. **Gestión de productos** — Registro, edición y eliminación de inventario
2. **Control de ventas** — Transacciones con actualización automática de stock
3. **Administración de usuarios** — Roles de Administrador y Usuario
4. **Reportes básicos** — 3 tipos de reportes exportables
5. **Dashboard estadístico** — Integración con Power BI

## Equipo

Proyecto desarrollado en el marco de la asignatura **Gestión de Proyectos TI**  
Programa: Ingeniería de Sistemas — Universidad de la Costa (CUC)  
Barranquilla, Colombia
