# Inventario Simple para Pyme o Tienda

Sistema web de control de inventario para pequeños negocios: registra productos,
entradas y salidas de stock, y avisa cuándo reabastecer.

Proyecto del curso Laboratorio de Ingeniería de Software
Universidad Tecnológica de Pereira · 2026

## Problema
Las tiendas pequeñas controlan el inventario en cuadernos u hojas de cálculo, lo que
genera desabastecimiento no detectado y pérdida de ventas.

## Alcance del MVP
**Incluye:** CRUD de productos, entradas y salidas de stock, alertas de reabastecimiento
(stock actual ≤ stock mínimo) e historial/bitácora de movimientos por producto y general.
**No incluye:** proveedores, facturación/POS, múltiples bodegas.

## Stack
Python 3.11+ · FastAPI · SQLAlchemy 2 · PostgreSQL / MySQL · HTML/CSS/JS con Bootstrap 5

## Estructura del repositorio
- `app/` Backend API REST con FastAPI (`api/`, `services/`, `repositories/`, `models/`, `schemas/`, `core/`)
- `frontend/` Interfaz web SPA (`index.html`, `css/styles.css`, `js/app.js`) basada en los mockups AVENUE
- `migrations/` Migraciones de base de datos con Alembic

## Endpoints principales (`/api`)
- `GET /api/health` y `GET /api/health/db` — Estado del servidor y conexión a base de datos
- `GET /api/products` — Listar catálogo de productos
- `POST /api/products` — Crear un nuevo producto con su stock inicial y mínimo
- `GET /api/products/{product_id}` — Consultar detalle de un producto
- `PUT /api/products/{product_id}` — Actualizar nombre, SKU y stock mínimo
- `DELETE /api/products/{product_id}` — Eliminar producto (solo si no tiene movimientos registrados)
- `POST /api/movements` — Registrar entrada (`ENTRY`) o salida (`EXIT`) de stock con bloqueo transaccional
- `GET /api/products/{product_id}/movements` — Consultar historial cronológico de movimientos de un producto
- `GET /api/movements` — Consultar bitácora general de movimientos (filtros opcionales `product_id` y `type`)
- `GET /api/alerts` — Listar productos en estado de alerta de reabastecimiento (`current_stock <= minimum_stock`)

## Cómo ejecutar localmente

1. Crear y activar entorno virtual e instalar dependencias:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Configurar el archivo `.env` a partir de `.env.example` con tu `DATABASE_URL`.
3. Ejecutar migraciones con Alembic:
   ```bash
   alembic upgrade head
   ```
4. Iniciar el servidor de desarrollo:
   ```bash
   uvicorn app.main:app --reload
   ```
5. Abrir en el navegador:
   - Interfaz Web (SPA): `http://localhost:8000/`
   - Documentación interactiva Swagger UI: `http://localhost:8000/docs`

## Equipo
- Santiago Gomez Ramirez
- Juan Diego Gil Arango
- Juan David Roman Marin

Docente: Juan Manuel Mejia Naranjo
