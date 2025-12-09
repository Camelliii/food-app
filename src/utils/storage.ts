import { Recipe, Ingredient, TodayMenuItem, ShoppingItem } from '../types';
import { indexedDBStorage } from './indexedDBStorage';

// 检查是否应该使用 IndexedDB（如果 LocalStorage 已满或数据量大）
const USE_INDEXED_DB = true; // 默认使用 IndexedDB 以支持大量数据

const STORAGE_KEYS = {
  RECIPES: 'family_recipes',
  INGREDIENTS: 'family_ingredients',
  TODAY_MENU: 'family_today_menu',
  SHOPPING_LIST: 'family_shopping_list',
};

// 初始化示例数据
const initialRecipes: Recipe[] = [
  {
    id: '1',
    name: '鸡内金蒸蛋',
    category: ['养生'],
    description: '可作为早餐',
    cookTime: 15,
    servings: 2,
    ingredients: [
      { ingredientId: 'egg', ingredientName: '鸡蛋', quantity: 2, unit: '个' },
      { ingredientId: 'chicken', ingredientName: '鸡内金', quantity: 2, unit: 'g' },
    ],
    steps: [
      { step: 1, description: '将鸡内金研磨成粉' },
      { step: 2, description: '打入鸡蛋，搅拌均匀' },
      { step: 3, description: '上锅蒸15分钟即可' },
    ],
  },
  {
    id: '2',
    name: '炒菜饭',
    category: ['热菜'],
    description: '简单快速，好吃还低脂',
    cookTime: 10,
    servings: 2,
    ingredients: [
      { ingredientId: 'rice', ingredientName: '米饭', quantity: 1, unit: '碗' },
      { ingredientId: 'lettuce', ingredientName: '生菜', quantity: 1, unit: '把' },
      { ingredientId: 'egg', ingredientName: '鸡蛋', quantity: 2, unit: '个' },
    ],
    steps: [
      { step: 1, description: '将生菜洗净切碎' },
      { step: 2, description: '热锅下油，炒鸡蛋' },
      { step: 3, description: '加入米饭和生菜一起翻炒' },
      { step: 4, description: '调味后即可出锅' },
    ],
    tags: ['简单快速', '好吃还低脂'],
  },
  {
    id: '3',
    name: '干煸杏鲍菇',
    category: ['热菜'],
    description: '下饭菜，营养丰富',
    cookTime: 20,
    servings: 3,
    ingredients: [
      { ingredientId: 'mushroom', ingredientName: '杏鲍菇', quantity: 300, unit: 'g' },
      { ingredientId: 'garlic', ingredientName: '大蒜', quantity: 3, unit: '瓣' },
      { ingredientId: 'oil', ingredientName: '油', quantity: 2, unit: '勺' },
    ],
    steps: [
      { step: 1, description: '杏鲍菇洗净切条' },
      { step: 2, description: '热锅下油，放入杏鲍菇煸炒' },
      { step: 3, description: '加入大蒜和调料继续煸炒' },
      { step: 4, description: '炒至金黄即可' },
    ],
  },
];

const initialIngredients: Ingredient[] = [
  { id: 'lettuce', name: '生菜', category: '蔬果', quantity: 2, unit: '把' },
  { id: 'mushroom', name: '口菇', category: '蔬果', quantity: 5, unit: '个' },
  { id: 'egg', name: '鸡蛋', category: '肉禽蛋', quantity: 0, unit: '个', needRestock: true },
  { id: 'rice', name: '米饭', category: '其他', quantity: 999, unit: '碗', isStaple: true },
  { id: 'oil', name: '蚝油', category: '调料', quantity: 999, unit: '瓶', isStaple: true },
  { id: 'sausage', name: '香肠', category: '熟食', quantity: 0.5, unit: '根' },
];

export const storage = {
  // 获取食谱
  async getRecipes(): Promise<Recipe[]> {
    if (USE_INDEXED_DB) {
      try {
        const recipes = await indexedDBStorage.getRecipes();
        if (recipes.length === 0) {
          // 初始化示例数据
          await indexedDBStorage.saveRecipes(initialRecipes);
          return initialRecipes;
        }
        return recipes;
      } catch (error) {
        console.error('IndexedDB 获取失败，尝试 LocalStorage:', error);
        // 降级到 LocalStorage
        return this.getRecipesSync();
      }
    }
    return this.getRecipesSync();
  },

  getRecipesSync(): Recipe[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECIPES);
      if (stored) {
        return JSON.parse(stored);
      }
      // 初始化示例数据
      this.saveRecipesSync(initialRecipes);
      return initialRecipes;
    } catch {
      return initialRecipes;
    }
  },

  // 保存食谱
  async saveRecipes(recipes: Recipe[]): Promise<void> {
    if (USE_INDEXED_DB) {
      try {
        await indexedDBStorage.saveRecipes(recipes);
        return;
      } catch (error) {
        console.error('IndexedDB 保存失败，降级到 LocalStorage:', error);
        // 降级到 LocalStorage
        this.saveRecipesSync(recipes);
      }
    } else {
      this.saveRecipesSync(recipes);
    }
  },

  saveRecipesSync(recipes: Recipe[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('LocalStorage 已满，请使用 IndexedDB');
        throw error;
      }
      throw error;
    }
  },

  // 获取食材
  getIngredients(): Ingredient[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.INGREDIENTS);
      if (stored) {
        return JSON.parse(stored);
      }
      // 初始化示例数据
      this.saveIngredients(initialIngredients);
      return initialIngredients;
    } catch {
      return initialIngredients;
    }
  },

  // 保存食材
  saveIngredients(ingredients: Ingredient[]): void {
    localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(ingredients));
  },

  // 获取今日菜单
  getTodayMenu(): TodayMenuItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TODAY_MENU);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch {
      return [];
    }
  },

  // 保存今日菜单
  saveTodayMenu(menu: TodayMenuItem[]): void {
    localStorage.setItem(STORAGE_KEYS.TODAY_MENU, JSON.stringify(menu));
  },

  // 获取采购清单
  getShoppingList(): ShoppingItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch {
      return [];
    }
  },

  // 保存采购清单
  saveShoppingList(list: ShoppingItem[]): void {
    localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(list));
  },
};

