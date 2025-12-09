import { Recipe, Ingredient, TodayMenuItem, ShoppingItem } from '../types';

const DB_NAME = 'RecipeManagerDB';
const DB_VERSION = 1;
const STORES = {
  RECIPES: 'recipes',
  INGREDIENTS: 'ingredients',
  TODAY_MENU: 'todayMenu',
  SHOPPING_LIST: 'shoppingList',
};

let db: IDBDatabase | null = null;

/**
 * 初始化 IndexedDB
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // 创建对象存储
      if (!database.objectStoreNames.contains(STORES.RECIPES)) {
        database.createObjectStore(STORES.RECIPES, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.INGREDIENTS)) {
        database.createObjectStore(STORES.INGREDIENTS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.TODAY_MENU)) {
        database.createObjectStore(STORES.TODAY_MENU, { keyPath: 'recipeId' });
      }
      if (!database.objectStoreNames.contains(STORES.SHOPPING_LIST)) {
        database.createObjectStore(STORES.SHOPPING_LIST, { keyPath: 'id' });
      }
    };
  });
}

/**
 * 获取对象存储
 */
async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const database = await initDB();
  const transaction = database.transaction([storeName], mode);
  return transaction.objectStore(storeName);
}

/**
 * 保存所有数据到 IndexedDB
 */
async function saveAll<T>(storeName: string, items: T[]): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  
  // 清空现有数据
  await new Promise<void>((resolve, reject) => {
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => resolve();
    clearRequest.onerror = () => reject(clearRequest.error);
  });

  // 批量添加数据
  return new Promise((resolve, reject) => {
    let completed = 0;
    let hasError = false;

    if (items.length === 0) {
      resolve();
      return;
    }

    items.forEach((item, index) => {
      const request = store.add(item);
      request.onsuccess = () => {
        completed++;
        if (completed === items.length && !hasError) {
          resolve();
        }
      };
      request.onerror = () => {
        if (!hasError) {
          hasError = true;
          reject(request.error);
        }
      };
    });
  });
}

/**
 * 从 IndexedDB 获取所有数据
 */
async function getAll<T>(storeName: string): Promise<T[]> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const indexedDBStorage = {
  // 获取食谱
  async getRecipes(): Promise<Recipe[]> {
    try {
      return await getAll<Recipe>(STORES.RECIPES);
    } catch (error) {
      console.error('获取食谱失败:', error);
      return [];
    }
  },

  // 保存食谱
  async saveRecipes(recipes: Recipe[]): Promise<void> {
    try {
      await saveAll(STORES.RECIPES, recipes);
    } catch (error) {
      console.error('保存食谱失败:', error);
      throw error;
    }
  },

  // 获取食材
  async getIngredients(): Promise<Ingredient[]> {
    try {
      return await getAll<Ingredient>(STORES.INGREDIENTS);
    } catch (error) {
      console.error('获取食材失败:', error);
      return [];
    }
  },

  // 保存食材
  async saveIngredients(ingredients: Ingredient[]): Promise<void> {
    try {
      await saveAll(STORES.INGREDIENTS, ingredients);
    } catch (error) {
      console.error('保存食材失败:', error);
      throw error;
    }
  },

  // 获取今日菜单
  async getTodayMenu(): Promise<TodayMenuItem[]> {
    try {
      return await getAll<TodayMenuItem>(STORES.TODAY_MENU);
    } catch (error) {
      console.error('获取今日菜单失败:', error);
      return [];
    }
  },

  // 保存今日菜单
  async saveTodayMenu(menu: TodayMenuItem[]): Promise<void> {
    try {
      await saveAll(STORES.TODAY_MENU, menu);
    } catch (error) {
      console.error('保存今日菜单失败:', error);
      throw error;
    }
  },

  // 获取采购清单
  async getShoppingList(): Promise<ShoppingItem[]> {
    try {
      return await getAll<ShoppingItem>(STORES.SHOPPING_LIST);
    } catch (error) {
      console.error('获取采购清单失败:', error);
      return [];
    }
  },

  // 保存采购清单
  async saveShoppingList(list: ShoppingItem[]): Promise<void> {
    try {
      await saveAll(STORES.SHOPPING_LIST, list);
    } catch (error) {
      console.error('保存采购清单失败:', error);
      throw error;
    }
  },
};

