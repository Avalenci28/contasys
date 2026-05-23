-- Schema Supabase para ContaSys (RLS habilitado)
-- Recomendado: ejecutar todo este archivo como migración inicial en Supabase SQL Editor.

BEGIN;

-- =========================================================
-- 1) TABLA: profiles (ya existe en este proyecto)
--    Se respeta: no eliminar. Se ajustan columnas faltantes.
-- =========================================================

-- Asegurar columnas requeridas para el wizard (nombre/email/rol)
-- Si tu tabla ya tiene estas columnas, estos ALTER TABLE no fallan.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS rol text NOT NULL DEFAULT 'usuario';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Activar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies (idem-potentes por nombre)
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

-- =========================================================
-- 2) TABLA: empresas
-- =========================================================

CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  nombre_empresa text NOT NULL,
  nit text,
  tipo_empresa text,
  sector_economico text,
  direccion text,
  ciudad text,
  pais text,
  telefono text,
  sitio_web text,

  moneda text DEFAULT 'COP',
  regimen_tributario text,

  maneja_inventario boolean DEFAULT false,
  maneja_nomina boolean DEFAULT false,
  factura_electronica boolean DEFAULT false,

  num_empleados text,
  como_conocio text,

  created_at timestamp DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresas_select_own" ON public.empresas;
DROP POLICY IF EXISTS "empresas_insert_own" ON public.empresas;
DROP POLICY IF EXISTS "empresas_update_own" ON public.empresas;
DROP POLICY IF EXISTS "empresas_delete_own" ON public.empresas;

-- El usuario solo ve/edita su(s) empresa(s)
CREATE POLICY "empresas_select_own"
  ON public.empresas
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "empresas_insert_own"
  ON public.empresas
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "empresas_update_own"
  ON public.empresas
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Nota: eliminar cuenta completa (auth.users) requiere endpoint seguro.
-- Aun así, aquí permitimos borrar la empresa para que el usuario administre sus datos.
CREATE POLICY "empresas_delete_own"
  ON public.empresas
  FOR DELETE
  USING (user_id = auth.uid());

-- =========================================================
-- Helper: policy expression para validar empresa_id = empresa del usuario
-- =========================================================

-- =========================================================
-- 3) TABLA: inventario
-- =========================================================

CREATE TABLE IF NOT EXISTS public.inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  categoria text,
  codigo_barras text,
  precio_compra numeric DEFAULT 0,
  precio_venta numeric DEFAULT 0,
  stock_actual integer DEFAULT 0,
  stock_minimo integer DEFAULT 5,
  unidad_medida text DEFAULT 'unidad',
  proveedor_id uuid,
  created_at timestamp DEFAULT now()
);

ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventario_select_own" ON public.inventario;
DROP POLICY IF EXISTS "inventario_insert_own" ON public.inventario;
DROP POLICY IF EXISTS "inventario_update_own" ON public.inventario;
DROP POLICY IF EXISTS "inventario_delete_own" ON public.inventario;

CREATE POLICY "inventario_select_own"
  ON public.inventario
  FOR SELECT
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "inventario_insert_own"
  ON public.inventario
  FOR INSERT
  WITH CHECK (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "inventario_update_own"
  ON public.inventario
  FOR UPDATE
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  )
  WITH CHECK (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "inventario_delete_own"
  ON public.inventario
  FOR DELETE
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

-- =========================================================
-- 4) TABLAS: ventas y venta_items
-- =========================================================

CREATE TABLE IF NOT EXISTS public.ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id uuid,
  fecha timestamp DEFAULT now(),
  subtotal numeric DEFAULT 0,
  descuento numeric DEFAULT 0,
  impuesto numeric DEFAULT 0,
  total numeric DEFAULT 0,
  estado text DEFAULT 'completada',
  notas text
);

CREATE TABLE IF NOT EXISTS public.venta_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid REFERENCES public.ventas(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES public.inventario(id),
  cantidad integer,
  precio_unitario numeric,
  subtotal numeric
);

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ventas_select_own" ON public.ventas;
DROP POLICY IF EXISTS "ventas_insert_own" ON public.ventas;
DROP POLICY IF EXISTS "ventas_update_own" ON public.ventas;
DROP POLICY IF EXISTS "ventas_delete_own" ON public.ventas;

CREATE POLICY "ventas_select_own"
  ON public.ventas
  FOR SELECT
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "ventas_insert_own"
  ON public.ventas
  FOR INSERT
  WITH CHECK (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "ventas_update_own"
  ON public.ventas
  FOR UPDATE
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  )
  WITH CHECK (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "ventas_delete_own"
  ON public.ventas
  FOR DELETE
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

-- RLS en venta_items valida por ventas.empresa_id
DROP POLICY IF EXISTS "venta_items_select_own" ON public.venta_items;
DROP POLICY IF EXISTS "venta_items_insert_own" ON public.venta_items;
DROP POLICY IF EXISTS "venta_items_update_own" ON public.venta_items;
DROP POLICY IF EXISTS "venta_items_delete_own" ON public.venta_items;

CREATE POLICY "venta_items_select_own"
  ON public.venta_items
  FOR SELECT
  USING (
    venta_id IN (
      SELECT id FROM public.ventas
      WHERE empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "venta_items_insert_own"
  ON public.venta_items
  FOR INSERT
  WITH CHECK (
    venta_id IN (
      SELECT id FROM public.ventas
      WHERE empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "venta_items_update_own"
  ON public.venta_items
  FOR UPDATE
  USING (
    venta_id IN (
      SELECT id FROM public.ventas
      WHERE empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    venta_id IN (
      SELECT id FROM public.ventas
      WHERE empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "venta_items_delete_own"
  ON public.venta_items
  FOR DELETE
  USING (
    venta_id IN (
      SELECT id FROM public.ventas
      WHERE empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
    )
  );

-- =========================================================
-- 5) TABLA: facturas
-- =========================================================

CREATE TABLE IF NOT EXISTS public.facturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  venta_id uuid REFERENCES public.ventas(id),
  numero_factura serial,
  cliente_id uuid,
  fecha_emision timestamp DEFAULT now(),
  fecha_vencimiento timestamp,
  estado text DEFAULT 'pendiente',
  total numeric DEFAULT 0
);

ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facturas_select_own" ON public.facturas;
DROP POLICY IF EXISTS "facturas_insert_own" ON public.facturas;
DROP POLICY IF EXISTS "facturas_update_own" ON public.facturas;
DROP POLICY IF EXISTS "facturas_delete_own" ON public.facturas;

CREATE POLICY "facturas_select_own"
  ON public.facturas
  FOR SELECT
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "facturas_insert_own"
  ON public.facturas
  FOR INSERT
  WITH CHECK (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "facturas_update_own"
  ON public.facturas
  FOR UPDATE
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  )
  WITH CHECK (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "facturas_delete_own"
  ON public.facturas
  FOR DELETE
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

-- =========================================================
-- 6) TABLAS: clientes y proveedores
-- =========================================================

CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  tipo_documento text,
  numero_documento text,
  email text,
  telefono text,
  direccion text,
  ciudad text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  tipo_documento text,
  numero_documento text,
  email text,
  telefono text,
  direccion text,
  ciudad text,
  created_at timestamp DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clientes_select_own" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert_own" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update_own" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete_own" ON public.clientes;

CREATE POLICY "clientes_select_own"
  ON public.clientes
  FOR SELECT
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "clientes_insert_own"
  ON public.clientes
  FOR INSERT
  WITH CHECK (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "clientes_update_own"
  ON public.clientes
  FOR UPDATE
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  )
  WITH CHECK (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "clientes_delete_own"
  ON public.clientes
  FOR DELETE
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "proveedores_select_own" ON public.proveedores;
DROP POLICY IF EXISTS "proveedores_insert_own" ON public.proveedores;
DROP POLICY IF EXISTS "proveedores_update_own" ON public.proveedores;
DROP POLICY IF EXISTS "proveedores_delete_own" ON public.proveedores;

CREATE POLICY "proveedores_select_own"
  ON public.proveedores
  FOR SELECT
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "proveedores_insert_own"
  ON public.proveedores
  FOR INSERT
  WITH CHECK (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "proveedores_update_own"
  ON public.proveedores
  FOR UPDATE
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  )
  WITH CHECK (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "proveedores_delete_own"
  ON public.proveedores
  FOR DELETE
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

-- =========================================================
-- 7) TABLA: gastos
-- =========================================================

CREATE TABLE IF NOT EXISTS public.gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  categoria text,
  monto numeric DEFAULT 0,
  fecha timestamp DEFAULT now(),
  proveedor_id uuid,
  comprobante_url text
);

ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gastos_select_own" ON public.gastos;
DROP POLICY IF EXISTS "gastos_insert_own" ON public.gastos;
DROP POLICY IF EXISTS "gastos_update_own" ON public.gastos;
DROP POLICY IF EXISTS "gastos_delete_own" ON public.gastos;

CREATE POLICY "gastos_select_own"
  ON public.gastos
  FOR SELECT
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "gastos_insert_own"
  ON public.gastos
  FOR INSERT
  WITH CHECK (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "gastos_update_own"
  ON public.gastos
  FOR UPDATE
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  )
  WITH CHECK (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

CREATE POLICY "gastos_delete_own"
  ON public.gastos
  FOR DELETE
  USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

-- =========================================================
-- 8) (Opcional) Comentarios de integridad
-- =========================================================

-- Recomendación: crear índices para performance
CREATE INDEX IF NOT EXISTS idx_empresas_user_id ON public.empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_inventario_empresa_id ON public.inventario(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ventas_empresa_id ON public.ventas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON public.ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_facturas_empresa_id ON public.facturas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_id ON public.clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_empresa_id ON public.proveedores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_gastos_empresa_id ON public.gastos(empresa_id);

COMMIT;

