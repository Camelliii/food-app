// 食材类型
export type IngredientCategory = '蔬果' | '肉禽蛋' | '熟食' | '调料' | '其他';

// 食材
export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity: number;
  unit: string;
  isStaple?: boolean; // 常备物品
  needRestock?: boolean; // 需要补货
}

// 菜谱分类
export type RecipeCategory = '全部' | '热菜' | '养生' | '烘焙' | '小吃' | '饮品' | '其他';

// 菜谱食材
export interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
}

// 烹饪步骤
export interface CookingStep {
  step: number;
  description: string;
  image?: string;
}

// 菜谱
export interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory[];
  image?: string;
  description: string;
  cookTime: number; // 制作时间（分钟）
  servings: number; // 适合人数
  ingredients: RecipeIngredient[];
  steps: CookingStep[];
  tags?: string[];
  // 制作信息
  taste?: string;      // 口味
  craft?: string;      // 工艺
  time?: string;       // 耗时（原始文本）
  difficulty?: string; // 难度
}

// 今日菜单项
export interface TodayMenuItem {
  recipeId: string;
  recipe: Recipe;
  completed: boolean;
  addedAt: number; // 时间戳
}

// 采购清单项
export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  fromRecipe: boolean; // 是否来自食谱
  recipeNames?: string[]; // 来自哪些食谱
  purchased: boolean; // 是否已购买
}

// 库存消耗项
export interface ConsumptionItem {
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  currentUnit: string;
  requiredQuantity: number;
  requiredUnit: string;
  afterConsumption: number;
  isStaple: boolean;
}

// 应用状态
export interface AppState {
  recipes: Recipe[];
  ingredients: Ingredient[];
  todayMenu: TodayMenuItem[];
  shoppingList: ShoppingItem[];
}

