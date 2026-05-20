import { PRODUCT_STATUS, PRODUCT_STATUS_LABEL } from './constants.js';
import { escapeHtml } from './utils.js';

export function renderSummaryCards(container, snapshot) {
  const totalCategories = snapshot.categories.length;
  const totalSubCategories = snapshot.sub_categories.length;
  const totalProducts = snapshot.products.length;
  const inUse = snapshot.products.filter((item) => item.status === PRODUCT_STATUS.IN_USE).length;
  const finished = snapshot.products.filter((item) => item.status === PRODUCT_STATUS.FINISHED).length;

  const cards = [
    { title: 'Categories', value: totalCategories, icon: 'bi-folder2-open' },
    { title: 'Sub-categories', value: totalSubCategories, icon: 'bi-diagram-3' },
    { title: 'Products', value: totalProducts, icon: 'bi-box-seam' },
    { title: 'In Use', value: inUse, icon: 'bi-play-circle' },
    { title: 'Finished', value: finished, icon: 'bi-check-circle' },
  ];

  container.innerHTML = cards.map((card) => `
    <div class="col-6 col-md-4 col-xl">
      <div class="stat-card">
        <div class="stat-icon"><i class="bi ${card.icon}"></i></div>
        <div>
          <div class="stat-title">${card.title}</div>
          <div class="stat-value">${card.value}</div>
        </div>
      </div>
    </div>
  `).join('');
}

export function renderInventory(container, emptyState, snapshot, searchTerm = '') {
  const query = searchTerm.trim().toLowerCase();
  const hasData = snapshot.categories.length > 0;

  emptyState.classList.toggle('d-none', hasData);
  container.classList.toggle('d-none', !hasData);

  if (!hasData) {
    container.innerHTML = '';
    return;
  }

  const html = snapshot.categories.map((category) => {
    const categorySubCategories = snapshot.sub_categories.filter((item) => item.category_id === category.id);
    const renderedSubCategories = categorySubCategories.map((subCategory) => {
      const subCategoryProducts = snapshot.products.filter((item) => item.sub_category_id === subCategory.id);
      const filteredProducts = subCategoryProducts.filter((product) => matchesSearch(query, category, subCategory, product));
      const subCategoryMatches = matchesSearch(query, category, subCategory, null);

      if (query && !subCategoryMatches && filteredProducts.length === 0) return '';

      return renderSubCategory(subCategory, filteredProducts, subCategoryProducts.length);
    }).filter(Boolean).join('');

    const categoryMatches = !query || category.name.toLowerCase().includes(query);
    if (query && !categoryMatches && !renderedSubCategories) return '';

    return `
      <div class="inventory-card" data-category-id="${category.id}">
        <div class="category-header">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <h3 class="category-title h6">
              <span class="category-title-icon"><i class="bi bi-folder2-open"></i></span>
              ${escapeHtml(category.name)}
            </h3>
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-outline-primary btn-sm" data-action="add-sub-category" data-category-id="${category.id}">
                <i class="bi bi-plus-lg me-1"></i> Sub-category
              </button>
              <button class="btn btn-outline-secondary btn-sm btn-icon" title="Edit category" data-action="edit-category" data-category-id="${category.id}">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm btn-icon" title="Delete category" data-action="delete-category" data-category-id="${category.id}">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
        ${renderedSubCategories || renderNoSubCategories(category.id)}
      </div>
    `;
  }).filter(Boolean).join('');

  container.innerHTML = html || `
    <div class="empty-state">
      <i class="bi bi-search"></i>
      <h3>No matching items</h3>
      <p>Try a different search keyword.</p>
    </div>
  `;
}

function renderSubCategory(subCategory, filteredProducts, originalProductCount) {
  const productHtml = filteredProducts.map(renderProduct).join('');

  return `
    <div class="subcategory-block" data-sub-category-id="${subCategory.id}">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <div class="subcategory-title">
          <i class="bi bi-diagram-3 text-primary"></i>
          ${escapeHtml(subCategory.name)}
          <span class="badge rounded-pill text-bg-light">${originalProductCount}</span>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-primary btn-sm" data-action="add-product" data-category-id="${subCategory.category_id}" data-sub-category-id="${subCategory.id}">
            <i class="bi bi-plus-lg me-1"></i> Product
          </button>
          <button class="btn btn-outline-secondary btn-sm btn-icon" title="Edit sub-category" data-action="edit-sub-category" data-sub-category-id="${subCategory.id}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm btn-icon" title="Delete sub-category" data-action="delete-sub-category" data-sub-category-id="${subCategory.id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
      <div>${productHtml || '<div class="text-muted small py-2">No products in this sub-category yet.</div>'}</div>
    </div>
  `;
}

function renderNoSubCategories(categoryId) {
  return `
    <div class="subcategory-block text-muted">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span>No sub-categories yet.</span>
        <button class="btn btn-primary btn-sm" data-action="add-sub-category" data-category-id="${categoryId}">
          <i class="bi bi-plus-lg me-1"></i> Add Sub-category
        </button>
      </div>
    </div>
  `;
}

function renderProduct(product) {
  const nextLabel = product.status === PRODUCT_STATUS.IN_USE ? 'Mark Finished' : 'Mark In Use';
  const badgeClass = product.status === PRODUCT_STATUS.IN_USE ? 'text-bg-success' : 'text-bg-secondary';

  return `
    <div class="product-row" data-product-id="${product.id}">
      <div>
        <div class="product-name">${escapeHtml(product.name)}</div>
        <span class="badge badge-status ${badgeClass}">${PRODUCT_STATUS_LABEL[product.status]}</span>
      </div>
      <div class="product-actions">
        <button class="btn btn-outline-success btn-sm" data-action="toggle-product" data-product-id="${product.id}">
          <i class="bi bi-arrow-repeat me-1"></i>${nextLabel}
        </button>
        <button class="btn btn-outline-secondary btn-sm btn-icon" title="Edit product" data-action="edit-product" data-product-id="${product.id}">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm btn-icon" title="Delete product" data-action="delete-product" data-product-id="${product.id}">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
  `;
}

function matchesSearch(query, category, subCategory, product) {
  if (!query) return true;
  return [category?.name, subCategory?.name, product?.name, product?.status]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}
