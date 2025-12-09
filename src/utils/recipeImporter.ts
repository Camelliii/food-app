import { Recipe } from '../types';
import { storage } from './storage';

/**
 * 从JSON文件导入菜谱
 */
export async function importRecipesFromJSON(jsonData: Recipe[], clearExisting: boolean = false): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let success = 0;
  let failed = 0;

  // 获取现有菜谱（异步）
  let existingRecipes = await storage.getRecipes();
  
  // 如果选择清空现有，先清空
  if (clearExisting) {
    existingRecipes = [];
    await storage.saveRecipes([]);
  }
  
  const existingNames = new Set(existingRecipes.map(r => r.name));

  // 验证并导入
  const newRecipes: Recipe[] = [];

  for (const recipe of jsonData) {
    try {
      // 验证必需字段
      if (!recipe.name || !recipe.steps || recipe.steps.length === 0) {
        failed++;
        errors.push(`菜谱 "${recipe.name || '未知'}" 缺少必需字段`);
        continue;
      }

      // 检查是否已存在（根据名称）
      if (existingNames.has(recipe.name)) {
        // 跳过重复的菜谱
        continue;
      }

      // 确保ID唯一
      recipe.id = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 确保分类有效
      if (!recipe.category || recipe.category.length === 0) {
        recipe.category = ['其他'];
      }

      // 确保有描述
      if (!recipe.description) {
        recipe.description = `${recipe.name}的制作方法`;
      }

      // 确保有制作时间
      if (!recipe.cookTime || recipe.cookTime <= 0) {
        recipe.cookTime = Math.max(10, recipe.steps.length * 5);
      }

      // 确保有适合人数
      if (!recipe.servings || recipe.servings <= 0) {
        recipe.servings = 2;
      }

      newRecipes.push(recipe);
      success++;
    } catch (error) {
      failed++;
      errors.push(`导入菜谱 "${recipe.name || '未知'}" 时出错: ${error}`);
    }
  }

  // 合并并保存（异步）
  if (newRecipes.length > 0) {
    const allRecipes = [...existingRecipes, ...newRecipes];
    await storage.saveRecipes(allRecipes);
  }

  return {
    success,
    failed,
    errors: errors.slice(0, 10), // 只返回前10个错误
  };
}

/**
 * 从文件内容导入（用于文件上传）
 */
export async function importRecipesFromFile(file: File, clearExisting: boolean = false): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        let text = e.target?.result as string;
        
        // 移除可能的BOM（Byte Order Mark）
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1);
        }
        
        // 确保使用UTF-8编码解析
        const jsonData = JSON.parse(text) as Recipe[];
        const result = await importRecipesFromJSON(jsonData, clearExisting);
        resolve(result);
      } catch (error) {
        resolve({
          success: 0,
          failed: 0,
          errors: [`文件解析失败: ${error}`],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: 0,
        failed: 0,
        errors: ['文件读取失败'],
      });
    };

    // 使用UTF-8编码读取文件（默认就是UTF-8，但明确指定更安全）
    reader.readAsText(file, 'UTF-8');
  });
}

