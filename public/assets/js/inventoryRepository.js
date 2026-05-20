import { STORE_NAMES } from './constants.js';
import { getAll, getById, put, remove, clearStore, replaceAllStores } from './db.js';

export const inventoryRepository = {
  getCategories: () => getAll(STORE_NAMES.CATEGORIES),
  getSubCategories: () => getAll(STORE_NAMES.SUB_CATEGORIES),
  getProducts: () => getAll(STORE_NAMES.PRODUCTS),
  getBackups: () => getAll(STORE_NAMES.BACKUPS),

  getCategory: (id) => getById(STORE_NAMES.CATEGORIES, id),
  getSubCategory: (id) => getById(STORE_NAMES.SUB_CATEGORIES, id),
  getProduct: (id) => getById(STORE_NAMES.PRODUCTS, id),

  saveCategory: (category) => put(STORE_NAMES.CATEGORIES, category),
  saveSubCategory: (subCategory) => put(STORE_NAMES.SUB_CATEGORIES, subCategory),
  saveProduct: (product) => put(STORE_NAMES.PRODUCTS, product),
  saveBackup: (backup) => put(STORE_NAMES.BACKUPS, backup),

  deleteCategory: (id) => remove(STORE_NAMES.CATEGORIES, id),
  deleteSubCategory: (id) => remove(STORE_NAMES.SUB_CATEGORIES, id),
  deleteProduct: (id) => remove(STORE_NAMES.PRODUCTS, id),

  clearMainData: async () => {
    await clearStore(STORE_NAMES.PRODUCTS);
    await clearStore(STORE_NAMES.SUB_CATEGORIES);
    await clearStore(STORE_NAMES.CATEGORIES);
  },

  replaceMainData: (data) => replaceAllStores(data),
};
