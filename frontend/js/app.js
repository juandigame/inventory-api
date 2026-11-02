/**
 * Frontend SPA logic for the Inventory Control MVP.
 * Connects to the FastAPI REST endpoints under /api.
 */

const API_BASE = "/api";

const state = {
  products: [],
  alerts: [],
  movements: [],
  catalogFilter: "all",
  searchQuery: "",
  editingProductId: null,
  selectedHistoryProductId: null,
  selectedHistoryType: "",
};

let movementModalInstance = null;
let toastInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("movementModal");
  if (modalEl) {
    movementModalInstance = new bootstrap.Modal(modalEl);
  }
  const toastEl = document.getElementById("appToast");
  if (toastEl) {
    toastInstance = new bootstrap.Toast(toastEl, { delay: 3500 });
  }

  bindEvents();
  refreshAllData();
});

function showToast(message, isError = false) {
  const toastEl = document.getElementById("appToast");
  const bodyEl = document.getElementById("appToastBody");
  if (!toastEl || !bodyEl || !toastInstance) return;

  toastEl.classList.remove("text-bg-dark", "text-bg-danger");
  toastEl.classList.add(isError ? "text-bg-danger" : "text-bg-dark");
  bodyEl.textContent = message;
  toastInstance.show();
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = payload && payload.detail ? payload.detail : `Error HTTP ${response.status}`;
    throw new Error(detail);
  }

  return payload;
}

function switchView(viewId) {
  document.querySelectorAll(".view-section").forEach((section) => {
    section.classList.toggle("d-none", section.id !== viewId);
  });

  document.querySelectorAll(".nav-link-custom").forEach((btn) => {
    const target = btn.getAttribute("data-view");
    btn.classList.toggle(
      "active",
      target === viewId || (viewId === "productFormView" && target === "catalogView")
    );
  });
}

async function refreshAllData() {
  try {
    const [products, alerts] = await Promise.all([
      apiRequest("/products"),
      apiRequest("/alerts"),
    ]);
    state.products = products;
    state.alerts = alerts;
    renderNavAlertBadge();
    renderCatalogTable();
    renderAlertsTable();
    populateProductSelects();
  } catch (err) {
    showToast(err.message || "No se pudo conectar con el servidor", true);
  }
}

function renderNavAlertBadge() {
  const badge = document.getElementById("navAlertCount");
  const bannerCount = document.getElementById("alertsBannerCount");
  const count = state.alerts.length;

  if (badge) {
    badge.textContent = String(count);
    badge.classList.toggle("d-none", count === 0);
  }
  if (bannerCount) {
    bannerCount.textContent = String(count);
  }
}

function getFilteredProducts() {
  const q = state.searchQuery.trim().toLowerCase();
  return state.products.filter((p) => {
    if (state.catalogFilter === "low" && p.current_stock > p.minimum_stock) {
      return false;
    }
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });
}

function renderCatalogTable() {
  const tbody = document.getElementById("productsTableBody");
  const countLabel = document.getElementById("productCountLabel");
  const filtered = getFilteredProducts();

  if (countLabel) {
    countLabel.textContent = `${filtered.length} ${filtered.length === 1 ? "producto" : "productos"}`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5 text-muted">
          No se encontraron productos que coincidan con el filtro actual.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered
    .map((p) => {
      let badgeClass = "status-ok";
      let badgeText = "En stock";
      if (p.current_stock === 0) {
        badgeClass = "status-out";
        badgeText = "Agotado";
      } else if (p.current_stock <= p.minimum_stock) {
        badgeClass = "status-low";
        badgeText = "Alerta";
      }

      return `
        <tr>
          <td class="fw-semibold">${escapeHtml(p.name)}</td>
          <td><span class="sku-tag">${escapeHtml(p.sku)}</span></td>
          <td><span class="fw-bold">${p.current_stock}</span> uds.</td>
          <td class="text-muted">${p.minimum_stock} uds.</td>
          <td><span class="status-badge ${badgeClass}">${badgeText}</span></td>
          <td class="text-end text-nowrap">
            <button type="button" class="action-link" onclick="openEditProduct(${p.id})">Editar</button>
            <button type="button" class="action-link text-danger" onclick="handleDeleteProduct(${p.id})">Eliminar</button>
            <button type="button" class="action-link" onclick="openMovementModal(${p.id}, 'ENTRY')">Entrada</button>
            <button type="button" class="action-link" onclick="openMovementModal(${p.id}, 'EXIT')">Salida</button>
            <button type="button" class="action-link fw-semibold" onclick="openProductHistory(${p.id})">Historial</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderAlertsTable() {
  const tbody = document.getElementById("alertsTableBody");
  if (state.alerts.length === 0) {
    // MSG-07 from requirements document
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5 text-muted">
          No existen productos en estado de alerta de reabastecimiento en este momento
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.alerts
    .map((p) => {
      const isZero = p.current_stock === 0;
      const badgeClass = isZero ? "status-out" : "status-low";
      const badgeText = isZero ? "Agotado (0)" : "Stock crítico";
      return `
        <tr>
          <td class="fw-semibold">${escapeHtml(p.name)}</td>
          <td><span class="sku-tag">${escapeHtml(p.sku)}</span></td>
          <td><span class="fw-bold text-danger">${p.current_stock}</span> uds.</td>
          <td class="text-muted">${p.minimum_stock} uds.</td>
          <td><span class="status-badge ${badgeClass}">${badgeText}</span></td>
          <td class="text-end">
            <button type="button" class="btn btn-outline-avenue btn-sm" onclick="openMovementModal(${p.id}, 'ENTRY')">
              Registrar entrada
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function populateProductSelects() {
  const movSelect = document.getElementById("movementProductSelect");
  const histSelect = document.getElementById("historyProductSelect");

  if (movSelect) {
    movSelect.innerHTML = state.products
      .map(
        (p) =>
          `<option value="${p.id}">${escapeHtml(p.name)} (${escapeHtml(p.sku)}) — Stock: ${p.current_stock}</option>`
      )
      .join("");
  }

  if (histSelect) {
    const currentVal = state.selectedHistoryProductId ? String(state.selectedHistoryProductId) : "";
    histSelect.innerHTML =
      `<option value="">Todos los productos (Bitácora general)</option>` +
      state.products
        .map(
          (p) =>
            `<option value="${p.id}" ${String(p.id) === currentVal ? "selected" : ""}>${escapeHtml(
              p.name
            )} (${escapeHtml(p.sku)})</option>`
        )
        .join("");
  }
}

/* ==================== CRUD PRODUCTOS ==================== */

function openNewProductForm() {
  state.editingProductId = null;
  document.getElementById("productFormTitle").textContent = "Nuevo producto";
  document.getElementById("productIdInput").value = "";
  document.getElementById("productNameInput").value = "";
  document.getElementById("productSkuInput").value = "";
  const stockInput = document.getElementById("productStockInput");
  stockInput.value = "0";
  stockInput.disabled = false;
  document.getElementById("productStockHelp").classList.add("d-none");
  document.getElementById("productMinStockInput").value = "0";
  hideAlert("productFormAlert");
  switchView("productFormView");
}

window.openEditProduct = function (productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;

  state.editingProductId = product.id;
  document.getElementById("productFormTitle").textContent = `Editar: ${product.name}`;
  document.getElementById("productIdInput").value = String(product.id);
  document.getElementById("productNameInput").value = product.name;
  document.getElementById("productSkuInput").value = product.sku;

  const stockInput = document.getElementById("productStockInput");
  stockInput.value = String(product.current_stock);
  stockInput.disabled = true;
  document.getElementById("productStockHelp").classList.remove("d-none");

  document.getElementById("productMinStockInput").value = String(product.minimum_stock);
  hideAlert("productFormAlert");
  switchView("productFormView");
};

async function handleSaveProduct(event) {
  event.preventDefault();
  hideAlert("productFormAlert");

  const name = document.getElementById("productNameInput").value.trim();
  const sku = document.getElementById("productSkuInput").value.trim();
  const currentStockStr = document.getElementById("productStockInput").value;
  const minStockStr = document.getElementById("productMinStockInput").value;

  const current_stock = Number(currentStockStr);
  const minimum_stock = Number(minStockStr);

  if (
    !name ||
    !sku ||
    currentStockStr === "" ||
    minStockStr === "" ||
    !Number.isInteger(current_stock) ||
    !Number.isInteger(minimum_stock) ||
    current_stock < 0 ||
    minimum_stock < 0
  ) {
    // MSG-02
    showAlert(
      "productFormAlert",
      "Los campos Nombre, SKU, Stock actual y Stock mínimo son obligatorios y el stock debe ser un número entero mayor o igual a cero"
    );
    return;
  }

  try {
    if (state.editingProductId === null) {
      await apiRequest("/products", {
        method: "POST",
        body: JSON.stringify({ name, sku, current_stock, minimum_stock }),
      });
      showToast("Producto creado exitosamente");
    } else {
      await apiRequest(`/products/${state.editingProductId}`, {
        method: "PUT",
        body: JSON.stringify({ name, sku, minimum_stock }),
      });
      showToast("Producto actualizado exitosamente");
    }
    await refreshAllData();
    switchView("catalogView");
  } catch (err) {
    showAlert("productFormAlert", err.message);
  }
}

window.handleDeleteProduct = async function (productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;

  if (!window.confirm(`¿Deseas eliminar el producto "${product.name}" (${product.sku})?`)) {
    return;
  }

  try {
    await apiRequest(`/products/${productId}`, { method: "DELETE" });
    showToast("Producto eliminado correctamente");
    await refreshAllData();
  } catch (err) {
    showToast(err.message, true);
  }
};

/* ==================== MOVIMIENTOS (ENTRADAS Y SALIDAS) ==================== */

window.openMovementModal = function (productId = null, movType = "ENTRY") {
  if (state.products.length === 0) {
    showToast("Primero debes registrar al menos un producto", true);
    return;
  }

  hideAlert("movementFormAlert");
  populateProductSelects();

  const radioEntry = document.getElementById("radioEntry");
  const radioExit = document.getElementById("radioExit");
  if (movType === "EXIT") {
    radioExit.checked = true;
  } else {
    radioEntry.checked = true;
  }

  const selectEl = document.getElementById("movementProductSelect");
  if (productId !== null) {
    selectEl.value = String(productId);
  }

  document.getElementById("movementQuantityInput").value = "";
  document.getElementById("movementNoteInput").value = "";

  updateMovementModalPreview();
  movementModalInstance.show();
};

function getSelectedMovementType() {
  const exitChecked = document.getElementById("radioExit").checked;
  return exitChecked ? "EXIT" : "ENTRY";
}

function updateMovementModalPreview() {
  const movType = getSelectedMovementType();
  const titleEl = document.getElementById("movementModalTitle");
  titleEl.textContent = movType === "ENTRY" ? "Registrar entrada" : "Registrar salida";

  const selectEl = document.getElementById("movementProductSelect");
  const productId = Number(selectEl.value);
  const product = state.products.find((p) => p.id === productId);
  const metaEl = document.getElementById("movementProductMeta");
  const previewEl = document.getElementById("movementStockAfterPreview");
  const qtyVal = Number(document.getElementById("movementQuantityInput").value);

  if (!product) {
    metaEl.textContent = "";
    previewEl.textContent = "—";
    return;
  }

  metaEl.textContent = `SKU ${product.sku} · Stock actual disponible: ${product.current_stock} uds.`;

  if (!Number.isInteger(qtyVal) || qtyVal <= 0) {
    previewEl.textContent = `${product.current_stock} uds.`;
    previewEl.className = "fw-bold";
    return;
  }

  const after =
    movType === "ENTRY" ? product.current_stock + qtyVal : product.current_stock - qtyVal;
  previewEl.textContent = `${after} uds.`;
  previewEl.className = after < 0 ? "fw-bold text-danger" : "fw-bold text-success";
}

async function handleCreateMovement(event) {
  event.preventDefault();
  hideAlert("movementFormAlert");

  const product_id = Number(document.getElementById("movementProductSelect").value);
  const type = getSelectedMovementType();
  const qtyStr = document.getElementById("movementQuantityInput").value;
  const quantity = Number(qtyStr);
  const noteRaw = document.getElementById("movementNoteInput").value.trim();
  const note = noteRaw ? noteRaw : null;

  if (!qtyStr || !Number.isInteger(quantity) || quantity <= 0) {
    // MSG-04 / MSG-06
    const msg =
      type === "ENTRY"
        ? "La cantidad de entrada debe ser un número entero mayor a cero"
        : "La cantidad de salida debe ser un número entero mayor a cero";
    showAlert("movementFormAlert", msg);
    return;
  }

  try {
    await apiRequest("/movements", {
      method: "POST",
      body: JSON.stringify({ product_id, type, quantity, note }),
    });
    movementModalInstance.hide();
    showToast(
      type === "ENTRY"
        ? "Entrada de stock registrada correctamente"
        : "Salida de stock registrada correctamente"
    );
    await refreshAllData();

    // Si estamos en la vista de historial, refrescar la tabla de historial también
    const historyView = document.getElementById("historyView");
    if (!historyView.classList.contains("d-none")) {
      await loadAndRenderHistory();
    }
  } catch (err) {
    showAlert("movementFormAlert", err.message);
  }
}

/* ==================== HISTORIAL Y BITÁCORA DE MOVIMIENTOS ==================== */

window.openProductHistory = async function (productId) {
  state.selectedHistoryProductId = productId;
  state.selectedHistoryType = "";
  const typeSelect = document.getElementById("historyTypeSelect");
  if (typeSelect) typeSelect.value = "";
  populateProductSelects();
  switchView("historyView");
  await loadAndRenderHistory();
};

async function openGeneralHistory() {
  populateProductSelects();
  switchView("historyView");
  await loadAndRenderHistory();
}

async function loadAndRenderHistory() {
  const tbody = document.getElementById("historyTableBody");
  const titleEl = document.getElementById("historyTitle");
  const stockBox = document.getElementById("historyCurrentStockBox");
  const stockVal = document.getElementById("historyCurrentStockVal");
  const countLabel = document.getElementById("historyCountLabel");

  const productId = state.selectedHistoryProductId;
  const movType = state.selectedHistoryType;

  try {
    let movements = [];
    if (productId && !movType) {
      // Endpoint específico del producto: GET /api/products/{id}/movements (CU05)
      movements = await apiRequest(`/products/${productId}/movements`);
    } else {
      // Endpoint general con filtros: GET /api/movements
      const params = new URLSearchParams();
      if (productId) params.set("product_id", String(productId));
      if (movType) params.set("type", movType);
      const qs = params.toString() ? `?${params.toString()}` : "";
      movements = await apiRequest(`/movements${qs}`);
    }

    state.movements = movements;

    if (productId) {
      const prod = state.products.find((p) => p.id === Number(productId));
      if (prod) {
        titleEl.innerHTML = `Historial: ${escapeHtml(prod.name)} <span class="text-muted fw-normal">(${escapeHtml(
          prod.sku
        )})</span>`;
        stockBox.classList.remove("d-none");
        stockVal.textContent = String(prod.current_stock);
      }
    } else {
      titleEl.textContent = "Bitácora General de Movimientos";
      stockBox.classList.add("d-none");
    }

    if (countLabel) {
      countLabel.textContent = `${movements.length} ${
        movements.length === 1 ? "movimiento" : "movimientos"
      }`;
    }

    if (movements.length === 0) {
      // MSG-09 cuando se consulta un producto sin movimientos
      const emptyMsg = productId
        ? "El producto no tiene movimientos registrados"
        : "No hay movimientos registrados para los filtros seleccionados";
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-5 text-muted">${emptyMsg}</td>
        </tr>
      `;
      return;
    }

    const productMap = new Map(state.products.map((p) => [p.id, p]));

    tbody.innerHTML = movements
      .map((m) => {
        const prod = productMap.get(m.product_id);
        const prodLabel = prod
          ? `<span class="fw-semibold">${escapeHtml(prod.name)}</span> <span class="sku-tag ms-1">${escapeHtml(
              prod.sku
            )}</span>`
          : `Producto #${m.product_id}`;

        const isEntry = m.type === "ENTRY";
        const typeHtml = isEntry
          ? `<span class="movement-type-pill movement-entry">Entrada</span>`
          : `<span class="movement-type-pill movement-exit">Salida</span>`;

        const qtyHtml = isEntry
          ? `<span class="fw-bold text-success">+${m.quantity}</span>`
          : `<span class="fw-bold text-danger">−${m.quantity}</span>`;

        const formattedDate = formatDateTime(m.created_at);

        return `
          <tr>
            <td>
              <div class="fw-semibold">${formattedDate.date}</div>
              <div class="text-muted" style="font-size: 0.76rem;">${formattedDate.time}</div>
            </td>
            <td>${prodLabel}</td>
            <td>${typeHtml}</td>
            <td>${qtyHtml}</td>
            <td class="text-muted">${m.stock_before} uds.</td>
            <td><span class="fw-bold">${m.stock_after}</span> uds.</td>
            <td class="text-muted small">${m.note ? escapeHtml(m.note) : "—"}</td>
          </tr>
        `;
      })
      .join("");
  } catch (err) {
    showToast(err.message, true);
  }
}

/* ==================== EXPORTAR CSV DE ALERTAS (US-07) ==================== */

function exportAlertsCsv() {
  if (state.alerts.length === 0) {
    showToast("No existen productos en alerta para exportar", true);
    return;
  }

  const headers = ["ID", "SKU", "Nombre", "Stock Actual", "Stock Minimo"];
  const rows = state.alerts.map((p) => [
    p.id,
    `"${String(p.sku).replace(/"/g, '""')}"`,
    `"${String(p.name).replace(/"/g, '""')}"`,
    p.current_stock,
    p.minimum_stock,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "alertas_reabastecimiento.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ==================== EVENTOS E INTERACCIÓN ==================== */

function bindEvents() {
  document.getElementById("brandHome").addEventListener("click", (e) => {
    e.preventDefault();
    switchView("catalogView");
  });

  document.getElementById("navCatalog").addEventListener("click", () => {
    refreshAllData();
    switchView("catalogView");
  });

  document.getElementById("navAlerts").addEventListener("click", () => {
    refreshAllData();
    switchView("alertsView");
  });

  document.getElementById("navHistory").addEventListener("click", () => {
    openGeneralHistory();
  });

  document.getElementById("btnNewProduct").addEventListener("click", openNewProductForm);
  document.getElementById("btnBackFromForm").addEventListener("click", () => switchView("catalogView"));
  document.getElementById("btnCancelProductForm").addEventListener("click", () => switchView("catalogView"));
  document.getElementById("productForm").addEventListener("submit", handleSaveProduct);

  document.getElementById("searchInput").addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    renderCatalogTable();
  });

  document.getElementById("filterAll").addEventListener("click", () => {
    state.catalogFilter = "all";
    document.getElementById("filterAll").classList.add("active");
    document.getElementById("filterLow").classList.remove("active");
    renderCatalogTable();
  });

  document.getElementById("filterLow").addEventListener("click", () => {
    state.catalogFilter = "low";
    document.getElementById("filterLow").classList.add("active");
    document.getElementById("filterAll").classList.remove("active");
    renderCatalogTable();
  });

  document.getElementById("btnExportAlertsCsv").addEventListener("click", exportAlertsCsv);

  document.getElementById("btnBackFromHistory").addEventListener("click", () => switchView("catalogView"));
  document.getElementById("btnOpenMovementFromHistory").addEventListener("click", () => {
    openMovementModal(state.selectedHistoryProductId || null, "ENTRY");
  });

  document.getElementById("historyProductSelect").addEventListener("change", (e) => {
    const val = e.target.value;
    state.selectedHistoryProductId = val ? Number(val) : null;
    loadAndRenderHistory();
  });

  document.getElementById("historyTypeSelect").addEventListener("change", (e) => {
    state.selectedHistoryType = e.target.value;
    loadAndRenderHistory();
  });

  document.getElementById("radioEntry").addEventListener("change", updateMovementModalPreview);
  document.getElementById("radioExit").addEventListener("change", updateMovementModalPreview);
  document.getElementById("movementProductSelect").addEventListener("change", updateMovementModalPreview);
  document.getElementById("movementQuantityInput").addEventListener("input", updateMovementModalPreview);
  document.getElementById("movementForm").addEventListener("submit", handleCreateMovement);
}

/* ==================== UTILIDADES ==================== */

function showAlert(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove("d-none");
}

function hideAlert(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = "";
  el.classList.add("d-none");
}

function formatDateTime(isoString) {
  if (!isoString) return { date: "—", time: "" };
  const d = new Date(isoString);
  const date = d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

