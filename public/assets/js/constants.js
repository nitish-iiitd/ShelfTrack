export const APP_NAME = 'ShelfTrack';
export const APP_VERSION = '1.0.0';

export const PRODUCT_STATUS = Object.freeze({
  IN_USE: 'in_use',
  FINISHED: 'finished',
});

export const PRODUCT_STATUS_LABEL = Object.freeze({
  [PRODUCT_STATUS.IN_USE]: 'In Use',
  [PRODUCT_STATUS.FINISHED]: 'Finished',
});

export const STORE_NAMES = Object.freeze({
  CATEGORIES: 'categories',
  SUB_CATEGORIES: 'sub_categories',
  PRODUCTS: 'products',
  BACKUPS: 'backups',
});
