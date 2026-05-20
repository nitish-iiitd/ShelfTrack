import { APP_NAME, APP_VERSION, PRODUCT_STATUS } from './constants.js';
import { inventoryRepository } from './inventoryRepository.js';
import { createBackup, getInventorySnapshot } from './inventoryService.js';
import { downloadJson, generateId, normalizeName, nowIso } from './utils.js';

export async function exportInventory() {
  const snapshot = await getInventorySnapshot();
  const payload = {
    app: APP_NAME,
    version: APP_VERSION,
    exported_at: nowIso(),
    data: snapshot,
    nested_data: buildNestedExport(snapshot),
  };

  const date = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
  downloadJson(`shelftrack-backup-${date}.json`, payload);
}

export async function exportBackup(backup) {
  const payload = {
    app: APP_NAME,
    version: APP_VERSION,
    exported_at: nowIso(),
    backup,
  };

  const date = new Date(backup.created_at).toISOString().slice(0, 19).replaceAll(':', '-');
  downloadJson(`shelftrack-local-backup-${date}.json`, payload);
}

export async function importInventoryFromFile(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON file.');
  }

  const normalizedData = normalizeImportPayload(parsed);
  await createBackup('before_import_replace');
  await inventoryRepository.replaceMainData(normalizedData);
  return normalizedData;
}

function buildNestedExport(snapshot) {
  const result = {};

  for (const category of snapshot.categories) {
    result[category.name] = {};
    const subCategories = snapshot.sub_categories.filter((item) => item.category_id === category.id);

    for (const subCategory of subCategories) {
      result[category.name][subCategory.name] = {};
      const products = snapshot.products.filter((item) => item.sub_category_id === subCategory.id);

      for (const product of products) {
        result[category.name][subCategory.name][product.name] = { status: product.status };
      }
    }
  }

  return result;
}

function normalizeImportPayload(payload) {
  if (payload?.data?.categories && payload?.data?.sub_categories && payload?.data?.products) {
    return normalizeFlatData(payload.data);
  }

  if (payload?.backup?.data?.categories && payload?.backup?.data?.sub_categories && payload?.backup?.data?.products) {
    return normalizeFlatData(payload.backup.data);
  }

  if (payload?.nested_data) {
    return normalizeNestedData(payload.nested_data);
  }

  return normalizeNestedData(payload);
}

function normalizeFlatData(data) {
  const categories = (data.categories || []).map((item) => ({
    id: item.id || generateId('cat'),
    name: normalizeName(item.name),
    created_at: item.created_at || nowIso(),
    updated_at: nowIso(),
  })).filter((item) => item.name);

  const categoryIds = new Set(categories.map((item) => item.id));

  const subCategories = (data.sub_categories || []).map((item) => ({
    id: item.id || generateId('sub'),
    category_id: item.category_id,
    name: normalizeName(item.name),
    created_at: item.created_at || nowIso(),
    updated_at: nowIso(),
  })).filter((item) => item.name && categoryIds.has(item.category_id));

  const subCategoryIds = new Set(subCategories.map((item) => item.id));

  const products = (data.products || []).map((item) => ({
    id: item.id || generateId('prod'),
    category_id: item.category_id,
    sub_category_id: item.sub_category_id,
    name: normalizeName(item.name),
    status: Object.values(PRODUCT_STATUS).includes(item.status) ? item.status : PRODUCT_STATUS.IN_USE,
    created_at: item.created_at || nowIso(),
    updated_at: nowIso(),
  })).filter((item) => item.name && categoryIds.has(item.category_id) && subCategoryIds.has(item.sub_category_id));

  return { categories, sub_categories: subCategories, products };
}

function normalizeNestedData(nestedData) {
  if (!nestedData || typeof nestedData !== 'object' || Array.isArray(nestedData)) {
    throw new Error('Unsupported JSON format.');
  }

  const categories = [];
  const subCategories = [];
  const products = [];

  for (const [categoryName, subCategoryMap] of Object.entries(nestedData)) {
    const cleanCategoryName = normalizeName(categoryName);
    if (!cleanCategoryName || !subCategoryMap || typeof subCategoryMap !== 'object') continue;

    const category = {
      id: generateId('cat'),
      name: cleanCategoryName,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    categories.push(category);

    for (const [subCategoryName, productMap] of Object.entries(subCategoryMap)) {
      const cleanSubCategoryName = normalizeName(subCategoryName);
      if (!cleanSubCategoryName || !productMap || typeof productMap !== 'object') continue;

      const subCategory = {
        id: generateId('sub'),
        category_id: category.id,
        name: cleanSubCategoryName,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      subCategories.push(subCategory);

      for (const [productName, productInfo] of Object.entries(productMap)) {
        const cleanProductName = normalizeName(productName);
        if (!cleanProductName) continue;

        const status = productInfo?.status === PRODUCT_STATUS.FINISHED ? PRODUCT_STATUS.FINISHED : PRODUCT_STATUS.IN_USE;
        products.push({
          id: generateId('prod'),
          category_id: category.id,
          sub_category_id: subCategory.id,
          name: cleanProductName,
          status,
          created_at: nowIso(),
          updated_at: nowIso(),
        });
      }
    }
  }

  return { categories, sub_categories: subCategories, products };
}
