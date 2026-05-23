# ContaSys — TODO (Integración Supabase + Auth)

## Paso 1 (Hecho)
- [x] Crear `src/lib/supabaseClient.js`
- [x] Ajustar `src/supabaseClient.js` para reexportar el cliente

## Paso 2
- [x] LoginForm/RegisterForm creados (validación + loading)
- [ ] Schema SQL completo de Supabase con RLS (tabla `profiles` + políticas)


## Paso 3
- [ ] Crear `src/components/Toast.jsx` y `Toast.module.css`
- [ ] Crear `src/components/UserMenu.jsx` y `UserMenu.module.css`
- [ ] Crear `src/components/LoginForm.jsx` y `RegisterForm.jsx`

## Paso 4
- [ ] Integrar sesión persistente en `src/App.jsx`
- [ ] Conectar `Navbar.jsx` con estado autenticado/no autenticado

## Paso 5
- [ ] Conectar scroll suave y enlaces del `Footer.jsx`
- [ ] Animación fade-in en `Modal.jsx`

## Paso 6
- [ ] Eliminar cuenta: Edge Function/endpoint de admin (sin exponer claves privadas)

## Paso 7
- [ ] Funcionalidad completa de todos los botones + validaciones + loading states
- [ ] Tests manuales: registro/login/persistencia/eliminar

