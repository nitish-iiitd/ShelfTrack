import { PRODUCT_STATUS, PRODUCT_STATUS_LABEL } from './constants.js';
import { escapeHtml } from './utils.js';

export function renderSummaryCards(container, snapshot) {
  const totalCategories = snapshot.categories.length;
  const totalSubCategories = snapshot.sub_categories.length;
  const totalProducts = snapshot.products.length;
  const inUse = snapshot.products.filter((item) => item.status === PRODUCT_STATUS.IN_USE).length;
  const finished = snapshot.products.filter((item) => item.status === PRODUCT_STATUS.FINISHED).length;

  const cards = [
    {
      title: 'Categories',
      value: totalCategories,
      icon: 'bi-folder2-open',
      className: 'summary-primary',
    },
    {
      title: 'Sub-categories',
      value: totalSubCategories,
      icon: 'bi-diagram-3',
      className: 'summary-info',
    },
    {
      title: 'Products',
      value: totalProducts,
      icon: 'bi-box-seam',
      className: 'summary-warning',
    },
    {
      title: 'In Use',
      value: inUse,
      icon: 'bi-play-circle',
      className: 'summary-success',
    },
    {
      title: 'Finished',
      value: finished,
      icon: 'bi-check-circle',
      className: 'summary-muted',
    },
  ];

  container.innerHTML = cards.map((card) => `
    <div class="col-6 col-md-4 col-xl">
      <div class="summary-card ${card.className}">
        <div class="summary-icon">
          <i class="bi ${card.icon}"></i>
        </div>
        <div>
          <div class="summary-value">${card.value}</div>
          <div class="summary-label">${card.title}</div>
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
    const categoryProducts = snapshot.products.filter((item) => item.category_id === category.id);

    const categoryFinishedCount = categoryProducts.filter((item) => item.status === PRODUCT_STATUS.FINISHED).length;
    const categoryTotalCount = categoryProducts.length;

    const categoryCollapseId = `category-collapse-${category.id}`;

    const renderedSubCategories = categorySubCategories.map((subCategory) => {
      const subCategoryProducts = snapshot.products.filter((item) => item.sub_category_id === subCategory.id);
      const filteredProducts = subCategoryProducts.filter((product) => matchesSearch(query, category, subCategory, product));
      const subCategoryMatches = matchesSearch(query, category, subCategory, null);

      if (query && !subCategoryMatches && filteredProducts.length === 0) return '';

      return renderSubCategory(subCategory, filteredProducts, subCategoryProducts);
    }).filter(Boolean).join('');

    const categoryMatches = !query || category.name.toLowerCase().includes(query);
    if (query && !categoryMatches && !renderedSubCategories) return '';

    return `
      <div class="inventory-card" data-category-id="${category.id}">
        <div class="category-header">
          <button
            class="category-toggle"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#${categoryCollapseId}"
            aria-expanded="true"
            aria-controls="${categoryCollapseId}"
          >
            <span class="category-icon">
              <i class="bi bi-folder2-open"></i>
            </span>

            <span class="category-title-wrap">
              <span class="category-title">${escapeHtml(category.name)}</span>
              <span class="category-count">${categoryFinishedCount}/${categoryTotalCount} finished</span>
            </span>

            <span class="category-chevron">
              <i class="bi bi-chevron-down"></i>
            </span>
          </button>

          <div class="category-actions">
            <button
              class="btn btn-primary btn-sm action-main-btn"
              data-action="add-sub-category"
              data-category-id="${category.id}"
            >
              <i class="bi bi-plus-lg"></i>
              <span>Add</span>
            </button>

            <button
              class="btn btn-light btn-sm icon-action-btn"
              title="Edit category"
              data-action="edit-category"
              data-category-id="${category.id}"
            >
              <i class="bi bi-pencil"></i>
            </button>

            <button
              class="btn btn-light btn-sm icon-action-btn text-danger"
              title="Delete category"
              data-action="delete-category"
              data-category-id="${category.id}"
            >
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>

        <div class="collapse show" id="${categoryCollapseId}">
          <div class="subcategory-list">
            ${renderedSubCategories || renderNoSubCategories(category.id)}
          </div>
        </div>
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

function renderSubCategory(subCategory, filteredProducts, allSubCategoryProducts) {
  const subCategoryCollapseId = `subcategory-collapse-${subCategory.id}`;

  const finishedCount = allSubCategoryProducts.filter((item) => item.status === PRODUCT_STATUS.FINISHED).length;
  const totalCount = allSubCategoryProducts.length;

  const productHtml = filteredProducts.map(renderProduct).join('');

  return `
    <div class="subcategory-card" data-sub-category-id="${subCategory.id}">
      <div class="subcategory-header">
        <button
          class="subcategory-toggle"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#${subCategoryCollapseId}"
          aria-expanded="false"
          aria-controls="${subCategoryCollapseId}"
        >
          <span class="subcategory-title-wrap">
            <span class="subcategory-title">${escapeHtml(subCategory.name)}</span>
            <span class="subcategory-count">${finishedCount}/${totalCount} finished</span>
          </span>

          <span class="subcategory-chevron">
            <i class="bi bi-chevron-down"></i>
          </span>
        </button>

        <div class="subcategory-actions">
          <button
            class="btn btn-outline-primary btn-sm action-main-btn"
            data-action="add-product"
            data-category-id="${subCategory.category_id}"
            data-sub-category-id="${subCategory.id}"
          >
            <i class="bi bi-plus-lg"></i>
            <span>Product</span>
          </button>

          <button
            class="btn btn-light btn-sm icon-action-btn"
            title="Edit sub-category"
            data-action="edit-sub-category"
            data-sub-category-id="${subCategory.id}"
          >
            <i class="bi bi-pencil"></i>
          </button>

          <button
            class="btn btn-light btn-sm icon-action-btn text-danger"
            title="Delete sub-category"
            data-action="delete-sub-category"
            data-sub-category-id="${subCategory.id}"
          >
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>

      <div class="collapse" id="${subCategoryCollapseId}">
        <div class="product-list">
          ${productHtml || '<div class="small-empty-row">No products in this sub-category yet.</div>'}
        </div>
      </div>
    </div>
  `;
}

function renderNoSubCategories(categoryId) {
  return `
    <div class="small-empty-row d-flex justify-content-between align-items-center gap-2">
      <span>No sub-categories yet.</span>
      <button
        class="btn btn-primary btn-sm"
        data-action="add-sub-category"
        data-category-id="${categoryId}"
      >
        <i class="bi bi-plus-lg me-1"></i>Add
      </button>
    </div>
  `;
}

function renderProduct(product) {
  const nextLabel = product.status === PRODUCT_STATUS.IN_USE ? 'Mark Finished' : 'Mark In Use';
  const badgeClass = product.status === PRODUCT_STATUS.IN_USE ? 'status-in-use' : 'status-finished';

  return `
    <div class="product-row" data-product-id="${product.id}">
      <div class="product-info">
        <div class="product-name">${escapeHtml(product.name)}</div>

        <button
          class="status-badge ${badgeClass}"
          data-action="toggle-product"
          data-product-id="${product.id}"
          title="${nextLabel}"
        >
          <i class="bi ${product.status === PRODUCT_STATUS.IN_USE ? 'bi-play-fill' : 'bi-check-lg'}"></i>
          ${PRODUCT_STATUS_LABEL[product.status]}
        </button>
      </div>

      <div class="product-actions">
        <button
          class="btn btn-light btn-sm icon-action-btn"
          title="Edit product"
          data-action="edit-product"
          data-product-id="${product.id}"
        >
          <i class="bi bi-pencil"></i>
        </button>

        <button
          class="btn btn-light btn-sm icon-action-btn text-danger"
          title="Delete product"
          data-action="delete-product"
          data-product-id="${product.id}"
        >
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