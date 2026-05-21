import { PRODUCT_STATUS } from './constants.js';
import { inventoryRepository } from './inventoryRepository.js';
import {
  addOrUpdateCategory,
  addOrUpdateProduct,
  addOrUpdateSubCategory,
  deleteAllDataWithBackup,
  deleteCategoryCascade,
  deleteProduct,
  deleteSubCategoryCascade,
  getBackups,
  getInventorySnapshot,
  restoreBackup,
  seedSampleData,
  toggleProductStatus,
} from './inventoryService.js';
import { exportBackup, exportInventory, importInventoryFromFile } from './importExportService.js';
import { renderInventory, renderSummaryCards } from './uiRenderer.js';
import { escapeHtml, formatDateTime } from './utils.js';

const state = {
  snapshot: { categories: [], sub_categories: [], products: [] },
  searchTerm: '',
};

const elements = {
  summaryCards: document.getElementById('summaryCards'),
  inventoryContainer: document.getElementById('inventoryContainer'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  btnClearSearch: document.getElementById('btnClearSearch'),
  btnAddCategory: document.getElementById('btnAddCategory'),
  btnEmptyAddCategory: document.getElementById('btnEmptyAddCategory'),
  btnSeedSampleData: document.getElementById('btnSeedSampleData'),
  btnImportJson: document.getElementById('btnImportJson'),
  btnExportJson: document.getElementById('btnExportJson'),
  btnDeleteAll: document.getElementById('btnDeleteAll'),
  btnOpenBackups: document.getElementById('btnOpenBackups'),
  btnDocs: document.getElementById('btnDocs'),
  jsonFileInput: document.getElementById('jsonFileInput'),
  toastContainer: document.getElementById('toastContainer'),
};

const modals = {
  category: new bootstrap.Modal(document.getElementById('categoryModal')),
  subCategory: new bootstrap.Modal(document.getElementById('subCategoryModal')),
  product: new bootstrap.Modal(document.getElementById('productModal')),
  confirm: new bootstrap.Modal(document.getElementById('confirmModal')),
  deleteAll: new bootstrap.Modal(document.getElementById('deleteAllModal')),
  backups: new bootstrap.Modal(document.getElementById('backupsModal')),
};

init();

async function init() {
  bindEvents();
  await refresh();
}

function bindEvents() {
  elements.btnAddCategory.addEventListener('click', openAddCategoryModal);
  elements.btnEmptyAddCategory.addEventListener('click', openAddCategoryModal);
  elements.btnSeedSampleData.addEventListener('click', handleSeedSampleData);
  elements.btnExportJson.addEventListener('click', handleExportJson);
  elements.btnImportJson.addEventListener('click', () => {
    closeMobileMenu();
    elements.jsonFileInput.click();
  });
  elements.btnDeleteAll.addEventListener('click', openDeleteAllModal);
  elements.btnOpenBackups.addEventListener('click', openBackupsModal);
  if (elements.btnDocs) elements.btnDocs.addEventListener('click', () => {
    closeMobileMenu();
    window.location.href = 'docs.html';
  });
  elements.btnClearSearch.addEventListener('click', clearSearch);

  elements.searchInput.addEventListener('input', (event) => {
    state.searchTerm = event.target.value;
    render();
  });

  elements.jsonFileInput.addEventListener('change', handleImportJson);
  elements.inventoryContainer.addEventListener('click', handleInventoryClick);

  document.getElementById('categoryForm').addEventListener('submit', handleCategorySubmit);
  document.getElementById('subCategoryForm').addEventListener('submit', handleSubCategorySubmit);
  document.getElementById('productForm').addEventListener('submit', handleProductSubmit);

  document.getElementById('deleteAllConfirmText').addEventListener('input', (event) => {
    document.getElementById('deleteAllConfirmButton').disabled = event.target.value !== 'delete-all';
  });
  document.getElementById('deleteAllConfirmButton').addEventListener('click', handleDeleteAllConfirmed);
}

async function refresh() {
  state.snapshot = await getInventorySnapshot();
  render();
}

function render() {
  renderSummaryCards(elements.summaryCards, state.snapshot);
  renderInventory(elements.inventoryContainer, elements.emptyState, state.snapshot, state.searchTerm);
}

function openAddCategoryModal() {
  document.getElementById('categoryModalTitle').textContent = 'Add Category';
  document.getElementById('categoryId').value = '';
  document.getElementById('categoryName').value = '';
  modals.category.show();
}

function openEditCategoryModal(categoryId) {
  const category = state.snapshot.categories.find((item) => item.id === categoryId);
  if (!category) return;
  document.getElementById('categoryModalTitle').textContent = 'Edit Category';
  document.getElementById('categoryId').value = category.id;
  document.getElementById('categoryName').value = category.name;
  modals.category.show();
}

function openAddSubCategoryModal(categoryId) {
  document.getElementById('subCategoryModalTitle').textContent = 'Add Sub-category';
  document.getElementById('subCategoryId').value = '';
  document.getElementById('subCategoryCategoryId').value = categoryId;
  document.getElementById('subCategoryName').value = '';
  modals.subCategory.show();
}

function openEditSubCategoryModal(subCategoryId) {
  const subCategory = state.snapshot.sub_categories.find((item) => item.id === subCategoryId);
  if (!subCategory) return;
  document.getElementById('subCategoryModalTitle').textContent = 'Edit Sub-category';
  document.getElementById('subCategoryId').value = subCategory.id;
  document.getElementById('subCategoryCategoryId').value = subCategory.category_id;
  document.getElementById('subCategoryName').value = subCategory.name;
  modals.subCategory.show();
}

function openAddProductModal(categoryId, subCategoryId) {
  document.getElementById('productModalTitle').textContent = 'Add Product';
  document.getElementById('productId').value = '';
  document.getElementById('productCategoryId').value = categoryId;
  document.getElementById('productSubCategoryId').value = subCategoryId;
  document.getElementById('productName').value = '';
  document.getElementById('productStatus').value = PRODUCT_STATUS.IN_USE;
  modals.product.show();
}

function openEditProductModal(productId) {
  const product = state.snapshot.products.find((item) => item.id === productId);
  if (!product) return;
  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('productId').value = product.id;
  document.getElementById('productCategoryId').value = product.category_id;
  document.getElementById('productSubCategoryId').value = product.sub_category_id;
  document.getElementById('productName').value = product.name;
  document.getElementById('productStatus').value = product.status;
  modals.product.show();
}

async function handleCategorySubmit(event) {
  event.preventDefault();
  try {
    await addOrUpdateCategory({
      id: document.getElementById('categoryId').value || null,
      name: document.getElementById('categoryName').value,
    });
    modals.category.hide();
    showToast('Category saved successfully.', 'success');
    await refresh();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function handleSubCategorySubmit(event) {
  event.preventDefault();
  try {
    await addOrUpdateSubCategory({
      id: document.getElementById('subCategoryId').value || null,
      category_id: document.getElementById('subCategoryCategoryId').value,
      name: document.getElementById('subCategoryName').value,
    });
    modals.subCategory.hide();
    showToast('Sub-category saved successfully.', 'success');
    await refresh();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function handleProductSubmit(event) {
  event.preventDefault();
  try {
    await addOrUpdateProduct({
      id: document.getElementById('productId').value || null,
      category_id: document.getElementById('productCategoryId').value,
      sub_category_id: document.getElementById('productSubCategoryId').value,
      name: document.getElementById('productName').value,
      status: document.getElementById('productStatus').value,
    });
    modals.product.hide();
    showToast('Product saved successfully.', 'success');
    await refresh();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function handleInventoryClick(event) {
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.dataset.action;

  try {
    if (action === 'add-sub-category') openAddSubCategoryModal(actionEl.dataset.categoryId);
    if (action === 'edit-category') openEditCategoryModal(actionEl.dataset.categoryId);
    if (action === 'edit-sub-category') openEditSubCategoryModal(actionEl.dataset.subCategoryId);
    if (action === 'add-product') openAddProductModal(actionEl.dataset.categoryId, actionEl.dataset.subCategoryId);
    if (action === 'edit-product') openEditProductModal(actionEl.dataset.productId);

    if (action === 'delete-category') {
      await confirmAction('Delete Category', 'This will delete the category and all sub-categories/products inside it.', async () => {
        await deleteCategoryCascade(actionEl.dataset.categoryId);
        showToast('Category deleted.', 'success');
        await refresh();
      });
    }

    if (action === 'delete-sub-category') {
      await confirmAction('Delete Sub-category', 'This will delete the sub-category and all products inside it.', async () => {
        await deleteSubCategoryCascade(actionEl.dataset.subCategoryId);
        showToast('Sub-category deleted.', 'success');
        await refresh();
      });
    }

    if (action === 'delete-product') {
      await confirmAction('Delete Product', 'This product will be removed from your inventory.', async () => {
        await deleteProduct(actionEl.dataset.productId);
        showToast('Product deleted.', 'success');
        await refresh();
      });
    }

    if (action === 'toggle-product') {
      // For checkboxes, prevent default so state doesn't flip out of sync before refresh
      if (actionEl.tagName === 'INPUT') event.preventDefault();
      await toggleProductStatus(actionEl.dataset.productId);
      await refresh();
    }
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function handleSeedSampleData() {
  closeMobileMenu();
  try {
    await seedSampleData();
    showToast('Sample data loaded.', 'success');
    await refresh();
  } catch (error) {
    showToast(error.message, 'warning');
  }
}

async function handleExportJson() {
  closeMobileMenu();
  try {
    await exportInventory();
    showToast('JSON exported.', 'success');
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function handleImportJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  await confirmAction('Import JSON', 'Import will replace current inventory. A backup of current data will be created first.', async () => {
    try {
      await importInventoryFromFile(file);
      showToast('JSON imported successfully.', 'success');
      await refresh();
    } catch (error) {
      showToast(error.message, 'danger');
    } finally {
      elements.jsonFileInput.value = '';
    }
  });
}

function openDeleteAllModal() {
  closeMobileMenu();
  document.getElementById('deleteAllConfirmText').value = '';
  document.getElementById('deleteAllConfirmButton').disabled = true;
  modals.deleteAll.show();
}

async function handleDeleteAllConfirmed() {
  try {
    await deleteAllDataWithBackup();
    modals.deleteAll.hide();
    showToast('All data deleted. A local backup was saved.', 'success');
    await refresh();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

async function openBackupsModal() {
  closeMobileMenu();
  const backups = await getBackups();
  const backupsList = document.getElementById('backupsList');

  if (!backups.length) {
    backupsList.innerHTML = '<div class="text-muted">No local backups yet.</div>';
  } else {
    backupsList.innerHTML = backups.map((backup) => `
      <div class="backup-item">
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
          <div>
            <div class="fw-semibold">${escapeHtml(backup.reason.replaceAll('_', ' '))}</div>
            <div class="small text-muted">Created: ${formatDateTime(backup.created_at)}</div>
            <div class="small text-muted">
              ${backup.data.categories.length} categories · ${backup.data.sub_categories.length} sub-categories · ${backup.data.products.length} products
            </div>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-outline-primary btn-sm" data-backup-action="export" data-backup-id="${backup.id}">
              <i class="bi bi-download me-1"></i> Export
            </button>
            <button class="btn btn-primary btn-sm" data-backup-action="restore" data-backup-id="${backup.id}">
              <i class="bi bi-arrow-counterclockwise me-1"></i> Restore
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  backupsList.onclick = async (event) => {
    const button = event.target.closest('button[data-backup-action]');
    if (!button) return;
    const backups = await getBackups();
    const backup = backups.find((item) => item.id === button.dataset.backupId);
    if (!backup) return;

    if (button.dataset.backupAction === 'export') {
      await exportBackup(backup);
      showToast('Backup exported.', 'success');
    }

    if (button.dataset.backupAction === 'restore') {
      modals.backups.hide();
      await confirmAction('Restore Backup', 'Current inventory will be replaced. A backup of current data will be created first.', async () => {
        await restoreBackup(backup.id);
        showToast('Backup restored.', 'success');
        await refresh();
      });
    }
  };

  modals.backups.show();
}

function clearSearch() {
  state.searchTerm = '';
  elements.searchInput.value = '';
  render();
}

function confirmAction(title, message, onConfirm) {
  return new Promise((resolve) => {
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalBody').textContent = message;

    const yesButton = document.getElementById('confirmModalYes');
    const newYesButton = yesButton.cloneNode(true);
    yesButton.parentNode.replaceChild(newYesButton, yesButton);

    newYesButton.addEventListener('click', async () => {
      modals.confirm.hide();
      await onConfirm();
      resolve(true);
    });

    modals.confirm.show();
  });
}

function showToast(message, type = 'primary') {
  const toastId = `toast_${Date.now()}`;
  const html = `
    <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${escapeHtml(message)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;
  elements.toastContainer.insertAdjacentHTML('beforeend', html);
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { delay: 2800 });
  toast.show();
  toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
}

function closeMobileMenu() {
  const navbarCollapse = document.getElementById('topNavbar');
  if (navbarCollapse && navbarCollapse.classList.contains('show')) {
    const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
    if (bsCollapse) bsCollapse.hide();
  }
}
