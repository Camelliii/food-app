import recipesData from '../../recipes_parsed.json';
import { Recipe, RecipeIngredient, CookingStep } from '../types';

// JSON 数据格式类型
export interface ParsedRecipeData {
  name: string;
  description: string;
  main_ingredients: Array<{ name: string; amount: string; unit: string }>;
  auxiliary_ingredients: Array<{ name: string; amount: string; unit: string }>;
  seasonings: Array<{ name: string; amount: string; unit: string }>;
  flavor: string;
  technique: string;
  time: string;
  difficulty: string;
  categories: string[];
  cover_images: string[];
  steps: Array<{ step: string; description: string }>;
  tips: string;
  tools: string;
  source_file: string;
}

// 9个主要分类
export const MAIN_CATEGORIES = ['热菜', '凉菜', '汤羹', '主食', '小吃', '西餐', '烘焙', '饮品', '泡酱腌菜'] as const;
export type MainCategory = typeof MAIN_CATEGORIES[number] | '其它';

// 将 JSON 数据转换为 Recipe 类型
function convertToRecipe(data: ParsedRecipeData, index: number): Recipe {
  // 合并所有食材
  const allIngredients: RecipeIngredient[] = [
    ...data.main_ingredients.map(ing => ({
      ingredientId: `ing_${index}_${ing.name}`,
      ingredientName: ing.name,
      quantity: ing.amount === '适量' || ing.amount === '少许' || ing.amount === '适当' || ing.amount === '若干' ? 0 : parseFloat(ing.amount) || 0,
      unit: ing.unit || (ing.amount === '适量' || ing.amount === '少许' || ing.amount === '适当' || ing.amount === '若干' ? '适量' : ing.amount),
    })),
    ...data.auxiliary_ingredients.map(ing => ({
      ingredientId: `ing_${index}_${ing.name}`,
      ingredientName: ing.name,
      quantity: ing.amount === '适量' || ing.amount === '少许' || ing.amount === '适当' || ing.amount === '若干' ? 0 : parseFloat(ing.amount) || 0,
      unit: ing.unit || (ing.amount === '适量' || ing.amount === '少许' || ing.amount === '适当' || ing.amount === '若干' ? '适量' : ing.amount),
    })),
    ...data.seasonings.map(ing => ({
      ingredientId: `ing_${index}_${ing.name}`,
      ingredientName: ing.name,
      quantity: ing.amount === '适量' || ing.amount === '少许' || ing.amount === '适当' || ing.amount === '若干' ? 0 : parseFloat(ing.amount) || 0,
      unit: ing.unit || (ing.amount === '适量' || ing.amount === '少许' || ing.amount === '适当' || ing.amount === '若干' ? '适量' : ing.amount),
    })),
  ];

  // 转换步骤
  const steps: CookingStep[] = data.steps.map(step => ({
    step: parseInt(step.step) || 0,
    description: step.description,
  }));

  // 匹配分类：检查 categories 中是否包含主要分类（中文全等匹配）
  const matchedCategories: string[] = [];
  const mainCategorySet = new Set(MAIN_CATEGORIES);
  
  // 检查是否有匹配的主要分类
  const matchedMainCategories = data.categories.filter(cat => mainCategorySet.has(cat as any));
  
  if (matchedMainCategories.length > 0) {
    // 如果匹配到主要分类，添加所有匹配的主要分类（允许出现在多个分类页）
    matchedCategories.push(...matchedMainCategories);
  } else {
    // 如果没有匹配到主要分类，归为"其它"
    matchedCategories.push('其它');
  }

  // 从 time 字段提取分钟数（用于 cookTime）
  let cookTime = 0;
  if (data.time) {
    const timeMatch = data.time.match(/(\d+)/);
    if (timeMatch) {
      cookTime = parseInt(timeMatch[1]);
      // 如果是"三刻钟"这样的，转换为45分钟
      if (data.time.includes('刻钟')) {
        cookTime = cookTime * 15;
      }
    }
  }

  return {
    id: `recipe_${index}`,
    name: data.name,
    category: matchedCategories as any[],
    image: data.cover_images[0] || undefined,
    description: data.description,
    cookTime,
    servings: 2, // 默认值
    ingredients: allIngredients,
    steps,
    taste: data.flavor || undefined,
    craft: data.technique || undefined,
    time: data.time || undefined,
    difficulty: data.difficulty || undefined,
    // 保存原始数据用于详情页展示
    _originalData: {
      main_ingredients: data.main_ingredients,
      auxiliary_ingredients: data.auxiliary_ingredients,
      seasonings: data.seasonings,
      cover_images: data.cover_images,
      tips: data.tips,
      tools: data.tools,
      categories: data.categories, // 保存所有原始分类
    },
  } as Recipe & { _originalData?: any };
}

// 加载所有菜谱数据
export function loadRecipesFromJSON(): Recipe[] {
  const recipes = (recipesData as ParsedRecipeData[]).map((data, index) => 
    convertToRecipe(data, index)
  );
  return recipes;
}

