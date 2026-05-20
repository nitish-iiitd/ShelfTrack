import { APP_NAME, APP_VERSION, PRODUCT_STATUS } from './constants.js';
import { inventoryRepository } from './inventoryRepository.js';
import { generateId, namesEqual, normalizeName, nowIso } from './utils.js';

export async function getInventorySnapshot() {
  const [categories, subCategories, products] = await Promise.all([
    inventoryRepository.getCategories(),
    inventoryRepository.getSubCategories(),
    inventoryRepository.getProducts(),
  ]);

  return {
    categories: categories.sort((a, b) => a.name.localeCompare(b.name)),
    sub_categories: subCategories.sort((a, b) => a.name.localeCompare(b.name)),
    products: products.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function createBackup(reason = 'manual') {
  const snapshot = await getInventorySnapshot();
  const backup = {
    id: generateId('backup'),
    reason,
    app: APP_NAME,
    version: APP_VERSION,
    data: snapshot,
    created_at: nowIso(),
  };
  await inventoryRepository.saveBackup(backup);
  return backup;
}

export async function addOrUpdateCategory({ id, name }) {
  const cleanName = normalizeName(name);
  if (!cleanName) throw new Error('Category name is required.');

  const categories = await inventoryRepository.getCategories();
  const duplicate = categories.find((category) => category.id !== id && namesEqual(category.name, cleanName));
  if (duplicate) throw new Error('A category with this name already exists.');

  const existing = id ? await inventoryRepository.getCategory(id) : null;
  const record = {
    id: id || generateId('cat'),
    name: cleanName,
    created_at: existing?.created_at || nowIso(),
    updated_at: nowIso(),
  };
  return inventoryRepository.saveCategory(record);
}

export async function deleteCategoryCascade(categoryId) {
  const [subCategories, products] = await Promise.all([
    inventoryRepository.getSubCategories(),
    inventoryRepository.getProducts(),
  ]);

  for (const product of products.filter((item) => item.category_id === categoryId)) {
    await inventoryRepository.deleteProduct(product.id);
  }
  for (const subCategory of subCategories.filter((item) => item.category_id === categoryId)) {
    await inventoryRepository.deleteSubCategory(subCategory.id);
  }
  await inventoryRepository.deleteCategory(categoryId);
}

export async function addOrUpdateSubCategory({ id, category_id, name }) {
  const cleanName = normalizeName(name);
  if (!category_id) throw new Error('Category is required.');
  if (!cleanName) throw new Error('Sub-category name is required.');

  const subCategories = await inventoryRepository.getSubCategories();
  const duplicate = subCategories.find((subCategory) => (
    subCategory.id !== id &&
    subCategory.category_id === category_id &&
    namesEqual(subCategory.name, cleanName)
  ));
  if (duplicate) throw new Error('This sub-category already exists inside the selected category.');

  const existing = id ? await inventoryRepository.getSubCategory(id) : null;
  const record = {
    id: id || generateId('sub'),
    category_id,
    name: cleanName,
    created_at: existing?.created_at || nowIso(),
    updated_at: nowIso(),
  };
  return inventoryRepository.saveSubCategory(record);
}

export async function deleteSubCategoryCascade(subCategoryId) {
  const products = await inventoryRepository.getProducts();
  for (const product of products.filter((item) => item.sub_category_id === subCategoryId)) {
    await inventoryRepository.deleteProduct(product.id);
  }
  await inventoryRepository.deleteSubCategory(subCategoryId);
}

export async function addOrUpdateProduct({ id, category_id, sub_category_id, name, status }) {
  const cleanName = normalizeName(name);
  if (!category_id) throw new Error('Category is required.');
  if (!sub_category_id) throw new Error('Sub-category is required.');
  if (!cleanName) throw new Error('Product name is required.');
  if (!Object.values(PRODUCT_STATUS).includes(status)) throw new Error('Invalid product status.');

  const products = await inventoryRepository.getProducts();
  const duplicate = products.find((product) => (
    product.id !== id &&
    product.category_id === category_id &&
    product.sub_category_id === sub_category_id &&
    namesEqual(product.name, cleanName)
  ));
  if (duplicate) throw new Error('This product already exists inside the selected sub-category.');

  const existing = id ? await inventoryRepository.getProduct(id) : null;
  const record = {
    id: id || generateId('prod'),
    category_id,
    sub_category_id,
    name: cleanName,
    status,
    created_at: existing?.created_at || nowIso(),
    updated_at: nowIso(),
  };
  return inventoryRepository.saveProduct(record);
}

export async function toggleProductStatus(productId) {
  const product = await inventoryRepository.getProduct(productId);
  if (!product) throw new Error('Product not found.');
  product.status = product.status === PRODUCT_STATUS.IN_USE ? PRODUCT_STATUS.FINISHED : PRODUCT_STATUS.IN_USE;
  product.updated_at = nowIso();
  return inventoryRepository.saveProduct(product);
}

export async function deleteProduct(productId) {
  return inventoryRepository.deleteProduct(productId);
}

export async function deleteAllDataWithBackup() {
  const backup = await createBackup('delete_all');
  await inventoryRepository.clearMainData();
  return backup;
}

export async function restoreBackup(backupId) {
  const backups = await inventoryRepository.getBackups();
  const backup = backups.find((item) => item.id === backupId);
  if (!backup) throw new Error('Backup not found.');
  await createBackup('before_backup_restore');
  await inventoryRepository.replaceMainData(backup.data);
  return backup;
}

export async function getBackups() {
  const backups = await inventoryRepository.getBackups();
  return backups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function seedSampleData() {
  const snapshot = await getInventorySnapshot();
  if (snapshot.categories.length || snapshot.sub_categories.length || snapshot.products.length) {
    throw new Error('Sample data can be loaded only when inventory is empty.');
  }

  const makeup = await addOrUpdateCategory({ name: 'Makeup' });
  const household = await addOrUpdateCategory({ name: 'Household' });

  const lipsticks = await addOrUpdateSubCategory({ category_id: makeup.id, name: 'Lipsticks' });
  const nailPolishes = await addOrUpdateSubCategory({ category_id: makeup.id, name: 'Nail Polishes' });
  const snacks = await addOrUpdateSubCategory({ category_id: household.id, name: 'Snacks' });
  const noodles = await addOrUpdateSubCategory({ category_id: household.id, name: 'Noodles' });

  await addOrUpdateProduct({ category_id: makeup.id, sub_category_id: lipsticks.id, name: 'Loreal Lips', status: PRODUCT_STATUS.IN_USE });
  await addOrUpdateProduct({ category_id: makeup.id, sub_category_id: lipsticks.id, name: 'Maybelline Lipstick', status: PRODUCT_STATUS.FINISHED });
  await addOrUpdateProduct({ category_id: makeup.id, sub_category_id: nailPolishes.id, name: 'Loreal Nails', status: PRODUCT_STATUS.FINISHED });
  await addOrUpdateProduct({ category_id: makeup.id, sub_category_id: nailPolishes.id, name: 'Maybelline Nailsart', status: PRODUCT_STATUS.IN_USE });
  await addOrUpdateProduct({ category_id: household.id, sub_category_id: snacks.id, name: 'Lays Chips', status: PRODUCT_STATUS.IN_USE });
  await addOrUpdateProduct({ category_id: household.id, sub_category_id: snacks.id, name: 'Haldirams Namkeen', status: PRODUCT_STATUS.FINISHED });
  await addOrUpdateProduct({ category_id: household.id, sub_category_id: noodles.id, name: 'Maggi', status: PRODUCT_STATUS.FINISHED });
  await addOrUpdateProduct({ category_id: household.id, sub_category_id: noodles.id, name: 'Wai Wai', status: PRODUCT_STATUS.IN_USE });
}
