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

  const html = cards.map((card) => `
    <div class="summary-chip ${card.className}">
      <div class="summary-chip-icon">
        <i class="bi ${card.icon}"></i>
      </div>
      <div class="summary-chip-content">
        <span class="summary-chip-value">${card.value}</span>
        <span class="summary-chip-label">${card.title}</span>
      </div>
    </div>
  `).join('');

  container.innerHTML = `<div class="summary-chips-container">${html}</div>`;
}

export function renderInventory(container, emptyState, snapshot, searchTerm = '') {
  const query = searchTerm.trim().toLowerCase();
  const hasData = snapshot.categories.length > 0;

  emptyState.classList.toggle('d-none', hasData);
  container.classList.toggle('d-none', !hasData);
  
  const footerBtnContainer = document.getElementById('addCategoryActionContainer');
  if (footerBtnContainer) footerBtnContainer.classList.toggle('d-none', !hasData);

  if (!hasData) {
    container.innerHTML = '';
    return;
  }

  // Preserve collapse state
  const existingContainer = container.innerHTML.trim() !== '';
  const expandedCategoryIds = new Set();
  const expandedSubcategoryIds = new Set();

  if (existingContainer) {
    Array.from(container.querySelectorAll('.collapse.show')).forEach((el) => {
      if (el.id.startsWith('category-collapse-')) expandedCategoryIds.add(el.id);
      if (el.id.startsWith('subcategory-collapse-')) expandedSubcategoryIds.add(el.id);
    });
  } else {
    // First render: categories expanded by default
    snapshot.categories.forEach((c) => expandedCategoryIds.add(`category-collapse-${c.id}`));
  }

  const html = snapshot.categories.map((category) => {
    const categorySubCategories = snapshot.sub_categories.filter((item) => item.category_id === category.id);
    const categoryProducts = snapshot.products.filter((item) => item.category_id === category.id);

    const categoryFinishedCount = categoryProducts.filter((item) => item.status === PRODUCT_STATUS.FINISHED).length;
    const categoryTotalCount = categoryProducts.length;

    const categoryCollapseId = `category-collapse-${category.id}`;
    const isCategoryExpanded = expandedCategoryIds.has(categoryCollapseId);

    const renderedSubCategories = categorySubCategories.map((subCategory) => {
      const subCategoryProducts = snapshot.products.filter((item) => item.sub_category_id === subCategory.id);
      const filteredProducts = subCategoryProducts.filter((product) => matchesSearch(query, category, subCategory, product));
      const subCategoryMatches = matchesSearch(query, category, subCategory, null);

      if (query && !subCategoryMatches && filteredProducts.length === 0) return '';

      const isSubExpanded = expandedSubcategoryIds.has(`subcategory-collapse-${subCategory.id}`);
      return renderSubCategory(subCategory, filteredProducts, subCategoryProducts, isSubExpanded);
    }).filter(Boolean).join('');

    const categoryMatches = !query || category.name.toLowerCase().includes(query);
    if (query && !categoryMatches && !renderedSubCategories) return '';

    return `
      <div class="inventory-card" data-category-id="${category.id}">
        <div class="category-header d-flex align-items-center flex-nowrap w-100 py-1 px-2 gap-2">
          <div
            class="category-toggle d-flex align-items-center flex-grow-1 text-start bg-transparent border-0 p-0 overflow-hidden"
            role="button"
            data-bs-toggle="collapse"
            data-bs-target="#${categoryCollapseId}"
            aria-expanded="${isCategoryExpanded}"
            aria-controls="${categoryCollapseId}"
          >
            <i class="bi bi-chevron-right toggle-chevron me-1 text-muted"></i>
            <span class="category-icon me-1 flex-shrink-0">
              <i class="bi bi-folder2-open"></i>
            </span>
            <span class="category-title text-wrap me-1 fw-bold" style="font-size:0.95rem; line-height:1.2;">${escapeHtml(category.name)}</span>
            <span class="category-count text-muted small flex-shrink-0" style="font-size:0.75rem;">${categoryFinishedCount}/${categoryTotalCount} finished</span>
          </div>

          <div class="category-actions d-flex align-items-center flex-shrink-0 gap-1">
            <button class="btn btn-primary btn-sm icon-action-btn" title="Add sub-category" data-action="add-sub-category" data-category-id="${category.id}"><i class="bi bi-plus-lg"></i></button>
            <div class="dropdown">
              <button class="btn btn-light btn-sm icon-action-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi bi-three-dots-vertical"></i></button>
              <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                <li><button class="dropdown-item" data-action="edit-category" data-category-id="${category.id}"><i class="bi bi-pencil me-2 text-muted"></i>Edit</button></li>
                <li><hr class="dropdown-divider"></li>
                <li><button class="dropdown-item text-danger" data-action="delete-category" data-category-id="${category.id}"><i class="bi bi-trash me-2"></i>Delete</button></li>
              </ul>
            </div>
          </div>
        </div>

        <div class="collapse ${isCategoryExpanded ? 'show' : ''}" id="${categoryCollapseId}">
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

function renderSubCategory(subCategory, filteredProducts, allSubCategoryProducts, isSubExpanded) {
  const subCategoryCollapseId = `subcategory-collapse-${subCategory.id}`;

  const finishedCount = allSubCategoryProducts.filter((item) => item.status === PRODUCT_STATUS.FINISHED).length;
  const totalCount = allSubCategoryProducts.length;

  const productHtml = filteredProducts.map(renderProduct).join('');

  return `
    <div class="subcategory-card" data-sub-category-id="${subCategory.id}">
      <div class="subcategory-header d-flex align-items-center flex-nowrap w-100 py-1 px-2 gap-2">
        <div
          class="subcategory-toggle d-flex align-items-center flex-grow-1 text-start bg-transparent border-0 p-0 overflow-hidden"
          role="button"
          data-bs-toggle="collapse"
          data-bs-target="#${subCategoryCollapseId}"
          aria-expanded="${isSubExpanded}"
          aria-controls="${subCategoryCollapseId}"
        >
          <i class="bi bi-chevron-right toggle-chevron me-1 text-muted"></i>
          <span class="subcategory-title text-wrap me-1 fw-bold" style="font-size:0.8rem; line-height:1.2;">${escapeHtml(subCategory.name)}</span>
          <span class="subcategory-count text-muted small flex-shrink-0" style="font-size:0.75rem;">${finishedCount}/${totalCount} finished</span>
        </div>

        <div class="subcategory-actions d-flex align-items-center flex-shrink-0 gap-1">
          <button class="btn btn-outline-primary btn-sm icon-action-btn" title="Add product" data-action="add-product" data-category-id="${subCategory.category_id}" data-sub-category-id="${subCategory.id}"><i class="bi bi-plus-lg"></i></button>
          <div class="dropdown">
            <button class="btn btn-light btn-sm icon-action-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi bi-three-dots-vertical"></i></button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
              <li><button class="dropdown-item" data-action="edit-sub-category" data-sub-category-id="${subCategory.id}"><i class="bi bi-pencil me-2 text-muted"></i>Edit</button></li>
              <li><hr class="dropdown-divider"></li>
              <li><button class="dropdown-item text-danger" data-action="delete-sub-category" data-sub-category-id="${subCategory.id}"><i class="bi bi-trash me-2"></i>Delete</button></li>
            </ul>
          </div>
        </div>
      </div>

      <div class="collapse ${isSubExpanded ? 'show' : ''}" id="${subCategoryCollapseId}">
        <div class="product-list">
          ${productHtml || '<div class="small-empty-row" style="font-size:0.8rem;">No products in this sub-category yet.</div>'}
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
  const isFinished = product.status === PRODUCT_STATUS.FINISHED;
  const nextLabel = isFinished ? 'Mark In Use' : 'Mark Finished';
  const nameStyle = isFinished ? 'text-decoration-line-through text-muted' : '';

  return `
    <div class="product-row d-flex align-items-center flex-nowrap w-100 py-1 px-2 gap-2" data-product-id="${product.id}">
      <div class="product-name text-wrap flex-grow-1 fw-semibold mb-0 ${nameStyle}" style="font-size:0.85rem; line-height:1.2; cursor:pointer;" data-action="toggle-product" data-product-id="${product.id}">${escapeHtml(product.name)}</div>
      
      <input 
        type="checkbox" 
        class="form-check-input status-checkbox flex-shrink-0 m-0" 
        style="width:1.15rem; height:1.15rem; cursor:pointer;"
        data-action="toggle-product" 
        data-product-id="${product.id}" 
        title="${nextLabel}"
        ${isFinished ? 'checked' : ''}
      >

      <div class="product-actions d-flex align-items-center flex-shrink-0 gap-1">
        <div class="dropdown">
          <button class="btn btn-light btn-sm icon-action-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi bi-three-dots-vertical"></i></button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
            <li><button class="dropdown-item" data-action="edit-product" data-product-id="${product.id}"><i class="bi bi-pencil me-2 text-muted"></i>Edit</button></li>
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item text-danger" data-action="delete-product" data-product-id="${product.id}"><i class="bi bi-trash me-2"></i>Delete</button></li>
          </ul>
        </div>
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