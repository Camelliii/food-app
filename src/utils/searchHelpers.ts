import { Recipe, RecipeCategory, Ingredient } from '../types';
import { checkRecipeAvailability } from './helpers';

/**
 * 计算字符串相似度（编辑距离）
 */
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  // 创建二维数组
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // 计算编辑距离
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 替换
          matrix[i][j - 1] + 1,     // 插入
          matrix[i - 1][j] + 1      // 删除
        );
      }
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return 1 - matrix[len1][len2] / maxLen; // 返回相似度 0-1
}

/**
 * 计算搜索相关性分数
 */
export function calculateRelevanceScore(recipe: Recipe, query: string): number {
  if (!query || query.trim() === '') return 0;
  
  const lowerQuery = query.toLowerCase().trim();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);
  const recipeName = recipe.name.toLowerCase();
  
  let score = 0;
  
  // 1. 菜名完全匹配（最高分）
  if (recipeName === lowerQuery) {
    score += 10000;
  }
  // 菜名开头匹配
  else if (recipeName.startsWith(lowerQuery)) {
    score += 5000;
  }
  // 菜名包含（按位置加权）
  else if (recipeName.includes(lowerQuery)) {
    const index = recipeName.indexOf(lowerQuery);
    score += 3000 - index * 20; // 越靠前分数越高
  }
  // 模糊匹配（相似度）
  else {
    const similarity = calculateSimilarity(recipeName, lowerQuery);
    if (similarity > 0.5) { // 相似度大于50%才计分
      score += Math.floor(similarity * 2000);
    }
  }
  
  // 2. 多关键词匹配（菜名）
  let matchedWords = 0;
  queryWords.forEach((word, index) => {
    if (recipeName.includes(word)) {
      score += 1000 - index * 50; // 第一个词权重更高
      matchedWords++;
    }
  });
  
  // 如果多个关键词都匹配，额外加分
  if (matchedWords > 1) {
    score += matchedWords * 500;
  }
  
  // 3. 分类完全匹配（新增：支持搜索分类名称，使用所有分类）
  const originalData = (recipe as any)._originalData;
  const categories = originalData?.categories || recipe.category || [];
  
  categories.forEach((cat: string) => {
    const catLower = cat.toLowerCase();
    if (catLower === lowerQuery) {
      score += 8000; // 分类完全匹配，高分
    } else if (catLower.includes(lowerQuery)) {
      score += 4000; // 分类包含搜索词
    }
    queryWords.forEach(word => {
      if (catLower.includes(word)) {
        score += 500;
      }
    });
  });
  
  // 4. 描述匹配
  if (recipe.description) {
    const descLower = recipe.description.toLowerCase();
    if (descLower.includes(lowerQuery)) {
      score += 200;
    }
    queryWords.forEach(word => {
      if (descLower.includes(word)) {
        score += 50;
      }
    });
  }
  
  // 5. 食材匹配（重要：搜索食材时优先显示）
  const ingredientMatches = recipe.ingredients.filter(ing => 
    ing.ingredientName.toLowerCase().includes(lowerQuery) ||
    queryWords.some(word => ing.ingredientName.toLowerCase().includes(word))
  );
  
  if (ingredientMatches.length > 0) {
    // 匹配的食材数量越多，分数越高
    score += 300 * ingredientMatches.length;
    
    // 如果所有关键词都匹配到食材，额外加分
    const allWordsMatched = queryWords.every(word =>
      recipe.ingredients.some(ing => ing.ingredientName.toLowerCase().includes(word))
    );
    if (allWordsMatched) {
      score += 500;
    }
  }
  
  // 6. 标签匹配
  if (recipe.tags && recipe.tags.length > 0) {
    recipe.tags.forEach(tag => {
      if (tag.toLowerCase().includes(lowerQuery)) {
        score += 150;
      }
      queryWords.forEach(word => {
        if (tag.toLowerCase().includes(word)) {
          score += 30;
        }
      });
    });
  }
  
  // 7. 工艺、口味匹配
  if (recipe.craft && recipe.craft.toLowerCase().includes(lowerQuery)) {
    score += 300;
  }
  if (recipe.taste && recipe.taste.toLowerCase().includes(lowerQuery)) {
    score += 300;
  }
  
  return score;
}

/**
 * 获取所有菜谱中出现过的分类（缓存）
 */
let cachedCategories: Set<string> | null = null;
function getAllCategories(recipes: Recipe[]): Set<string> {
  if (cachedCategories) {
    return cachedCategories;
  }
  
  const categories = new Set<string>();
  recipes.forEach(recipe => {
    // 从原始数据获取所有分类
    const originalData = (recipe as any)._originalData;
    if (originalData?.categories) {
      originalData.categories.forEach((cat: string) => {
        categories.add(cat.toLowerCase());
      });
    } else if (recipe.category) {
      recipe.category.forEach(cat => {
        categories.add(cat.toLowerCase());
      });
    }
  });
  
  cachedCategories = categories;
  return categories;
}

/**
 * 判断搜索类型：菜名、分类、食材
 */
export function getSearchType(query: string, recipes: Recipe[]): 'name' | 'category' | 'ingredient' {
  if (!query || query.trim() === '') return 'name';
  
  const lowerQuery = query.toLowerCase().trim();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);
  
  // 获取所有已存在的分类
  const allCategories = getAllCategories(recipes);
  
  // 检查是否是分类搜索（查询词是否匹配任何已存在的分类）
  const isCategorySearch = queryWords.some(word => {
    // 完全匹配
    if (allCategories.has(word)) {
      return true;
    }
    // 部分匹配（查询词包含在分类中，或分类包含在查询词中）
    return Array.from(allCategories).some(cat => 
      cat.includes(word) || word.includes(cat)
    );
  });
  
  if (isCategorySearch) {
    return 'category';
  }
  
  // 统计在菜名中匹配的数量 vs 在食材中匹配的数量
  let nameMatches = 0;
  let ingredientMatches = 0;
  
  recipes.slice(0, 100).forEach(recipe => { // 只检查前100个以提高性能
    const nameLower = recipe.name.toLowerCase();
    const hasNameMatch = queryWords.some(word => nameLower.includes(word));
    if (hasNameMatch) nameMatches++;
    
    const hasIngredientMatch = recipe.ingredients.some(ing =>
      queryWords.some(word => ing.ingredientName.toLowerCase().includes(word))
    );
    if (hasIngredientMatch) ingredientMatches++;
  });
  
  // 如果食材匹配明显多于菜名匹配，认为是食材搜索
  if (ingredientMatches > nameMatches * 1.5) {
    return 'ingredient';
  }
  
  return 'name';
}

/**
 * 智能搜索和排序菜谱
 */
export function searchAndSortRecipes(
  recipes: Recipe[],
  query: string,
  selectedCategory: RecipeCategory
): { results: Recipe[]; searchType: string } {
  if (!query || query.trim() === '') {
    // 没有搜索词时，只按分类筛选
    if (selectedCategory === '全部') {
      return { results: recipes, searchType: 'none' };
    }
    return { 
      results: recipes.filter(recipe => 
        recipe.category && recipe.category.includes(selectedCategory as RecipeCategory)
      ),
      searchType: 'none'
    };
  }
  
  const lowerQuery = query.toLowerCase().trim();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);
  
  // 判断搜索类型
  const searchType = getSearchType(query, recipes);
  
  // 筛选和评分
  const scoredRecipes = recipes
    .map(recipe => {
      // 先进行基本筛选
      const categoryMatch = selectedCategory === '全部' || 
        (recipe.category && recipe.category.includes(selectedCategory as RecipeCategory));
      
      if (!categoryMatch) {
        return { recipe, score: -1 };
      }
      
      // 检查是否匹配
      const recipeName = recipe.name.toLowerCase();
      const nameMatch = recipeName.includes(lowerQuery) || 
        queryWords.some(word => recipeName.includes(word)) ||
        calculateSimilarity(recipeName, lowerQuery) > 0.5; // 相似度匹配
      
      // 检查所有分类（包括原始数据中的分类）
      let categoryMatchText = false;
      const originalData = (recipe as any)._originalData;
      if (originalData?.categories) {
        categoryMatchText = originalData.categories.some((cat: string) =>
          cat.toLowerCase().includes(lowerQuery) ||
          queryWords.some(word => cat.toLowerCase().includes(word))
        );
      } else if (recipe.category) {
        categoryMatchText = recipe.category.some(cat =>
          cat.toLowerCase().includes(lowerQuery) ||
          queryWords.some(word => cat.toLowerCase().includes(word))
        );
      }
      
      const descMatch = recipe.description?.toLowerCase().includes(lowerQuery);
      const ingredientMatch = recipe.ingredients.some(ing =>
        ing.ingredientName.toLowerCase().includes(lowerQuery) ||
        queryWords.some(word => ing.ingredientName.toLowerCase().includes(word))
      );
      const tagMatch = recipe.tags?.some(tag =>
        tag.toLowerCase().includes(lowerQuery) ||
        queryWords.some(word => tag.toLowerCase().includes(word))
      );
      
      const craftMatch = recipe.craft?.toLowerCase().includes(lowerQuery);
      const tasteMatch = recipe.taste?.toLowerCase().includes(lowerQuery);
      
      // 如果没有任何匹配，跳过
      if (!nameMatch && !descMatch && !ingredientMatch && !tagMatch && !categoryMatchText && !craftMatch && !tasteMatch) {
        return { recipe, score: -1 };
      }
      
      // 计算相关性分数
      let score = calculateRelevanceScore(recipe, query);
      
      // 根据搜索类型调整权重
      if (searchType === 'category' && categoryMatchText) {
        score += 2000; // 分类搜索时，提高分类匹配的权重
      } else if (searchType === 'ingredient' && ingredientMatch) {
        score += 1000; // 食材搜索时，提高食材匹配的权重
        
        // 匹配的食材数量越多，分数越高
        const matchedIngredients = recipe.ingredients.filter(ing =>
          queryWords.some(word => ing.ingredientName.toLowerCase().includes(word))
        );
        score += matchedIngredients.length * 200;
      } else if (searchType === 'name' && nameMatch) {
        score += 1000; // 菜名搜索时，提高菜名匹配的权重
      }
      
      return { recipe, score };
    })
    .filter(item => item.score >= 0) // 过滤掉不匹配的
    .sort((a, b) => b.score - a.score); // 按分数降序排序
  
  return { 
    results: scoredRecipes.map(item => item.recipe),
    searchType
  };
}

/**
 * 检查菜谱是否包含所有指定的食材关键词
 */
function containsAllIngredients(recipe: Recipe, ingredientKeywords: string[]): boolean {
  if (ingredientKeywords.length === 0) return false;
  
  return ingredientKeywords.every(keyword => 
    recipe.ingredients.some(ing => 
      ing.ingredientName.toLowerCase().includes(keyword.toLowerCase())
    )
  );
}

/**
 * 计算菜谱包含多少个指定的食材关键词
 */
function countMatchedIngredients(recipe: Recipe, ingredientKeywords: string[]): number {
  if (ingredientKeywords.length === 0) return 0;
  
  return ingredientKeywords.filter(keyword =>
    recipe.ingredients.some(ing =>
      ing.ingredientName.toLowerCase().includes(keyword.toLowerCase())
    )
  ).length;
}

/**
 * 按食材齐全程度排序菜谱（无搜索词时使用）
 * 只返回缺0、1、2样的菜谱，缺3样及以上的通过"查看更多"显示
 */
export function sortRecipesByAvailability(
  recipes: Recipe[],
  ingredients: Ingredient[],
  showAll: boolean = false
): {
  displayed: Recipe[];
  hasMore: boolean;
  all: Recipe[];
} {
  const sorted = recipes
    .map(recipe => {
      const availability = checkRecipeAvailability(recipe, ingredients);
      return {
        recipe,
        missingCount: availability.missingCount,
        isAvailable: availability.available,
      };
    })
    .sort((a, b) => {
      // 1. 食材齐全的优先
      if (a.isAvailable !== b.isAvailable) {
        return a.isAvailable ? -1 : 1;
      }
      // 2. 缺的食材数量少的优先
      return a.missingCount - b.missingCount;
    })
    .map(item => item.recipe);
  
  if (showAll) {
    // 显示所有菜谱
    return {
      displayed: sorted,
      hasMore: false,
      all: sorted,
    };
  }
  
  // 只显示缺0、1、2样的菜谱
  const displayed = sorted.filter(recipe => {
    const availability = checkRecipeAvailability(recipe, ingredients);
    return availability.missingCount <= 2;
  });
  
  const hasMore = sorted.length > displayed.length;
  
  return {
    displayed,
    hasMore,
    all: sorted,
  };
}

/**
 * 智能推荐菜谱（当没有完全匹配时）
 */
export function getRecommendedRecipes(
  recipes: Recipe[],
  query: string,
  selectedCategory: RecipeCategory,
  ingredients: Ingredient[],
  showAll: boolean = false
): {
  exactMatches: Recipe[];
  recommendations: Recipe[];
  hasExactMatch: boolean;
  hasMore: boolean;
  searchType: string;
} {
  if (!query || query.trim() === '') {
    // 没有搜索词时，按分类筛选并按食材齐全程度排序
    let filtered = selectedCategory === '全部'
      ? recipes
      : recipes.filter(recipe => 
          recipe.category && recipe.category.includes(selectedCategory as RecipeCategory)
        );
    
    // 按食材齐全程度排序（只显示缺0、1、2样的）
    const sortedResult = sortRecipesByAvailability(filtered, ingredients, showAll);
    
    return {
      exactMatches: sortedResult.displayed,
      recommendations: [],
      hasExactMatch: true,
      hasMore: sortedResult.hasMore,
      searchType: 'none',
    };
  }

  const lowerQuery = query.toLowerCase().trim();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);
  
  // 判断搜索类型
  const searchType = getSearchType(query, recipes);
  
  // 对于菜名搜索和分类搜索，使用通用搜索逻辑
  if (searchType === 'name' || searchType === 'category') {
    const searchResult = searchAndSortRecipes(recipes, query, selectedCategory);
    
    // 区分完全匹配和近似匹配
    const exactMatches: Recipe[] = [];
    const recommendations: Recipe[] = [];
    
    searchResult.results.forEach(recipe => {
      const recipeName = recipe.name.toLowerCase();
      // 完全匹配或开头匹配算精确匹配
      if (recipeName === lowerQuery || recipeName.startsWith(lowerQuery) || recipeName.includes(lowerQuery)) {
        exactMatches.push(recipe);
      } 
      // 分类完全匹配也算精确匹配（检查所有原始分类）
      else if (searchType === 'category') {
        const originalData = (recipe as any)._originalData;
        const categories = originalData?.categories || recipe.category || [];
        const hasCategoryMatch = categories.some((cat: string) => 
          cat.toLowerCase() === lowerQuery || cat.toLowerCase().includes(lowerQuery)
        );
        if (hasCategoryMatch) {
          exactMatches.push(recipe);
        } else {
          recommendations.push(recipe);
        }
      }
      // 其他算近似匹配（推荐）
      else {
        recommendations.push(recipe);
      }
    });
    
    return {
      exactMatches,
      recommendations,
      hasExactMatch: exactMatches.length > 0,
      hasMore: false,
      searchType,
    };
  }

  // 食材搜索模式：检查是否有包含所有食材的菜谱
  const categoryFiltered = selectedCategory === '全部'
    ? recipes
    : recipes.filter(recipe => 
        recipe.category && recipe.category.includes(selectedCategory as RecipeCategory)
      );

  // 查找完全匹配的菜谱（包含所有搜索的食材）
  const exactMatches = categoryFiltered.filter(recipe =>
    containsAllIngredients(recipe, queryWords)
  );

  // 如果有完全匹配，直接返回
  if (exactMatches.length > 0) {
    const sortedExactMatches = exactMatches
      .map(recipe => ({
        recipe,
        score: calculateRelevanceScore(recipe, query),
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.recipe);

    return {
      exactMatches: sortedExactMatches,
      recommendations: [],
      hasExactMatch: true,
      hasMore: false,
      searchType,
    };
  }

  // 没有完全匹配，生成推荐
  const recommendations = categoryFiltered
    .map(recipe => {
      // 计算匹配的食材数量
      const matchedCount = countMatchedIngredients(recipe, queryWords);
      
      if (matchedCount === 0) {
        return { recipe, matchedCount: 0, score: -1 };
      }

      // 检查食材是否齐全
      const availability = checkRecipeAvailability(recipe, ingredients);
      const isAvailable = availability.available;

      // 计算推荐分数
      let score = matchedCount * 1000;
      
      if (isAvailable) {
        score += 5000;
      }
      
      const matchRatio = matchedCount / queryWords.length;
      score += matchRatio * 2000;

      return {
        recipe,
        matchedCount,
        score,
        isAvailable,
      };
    })
    .filter(item => item.score >= 0)
    .sort((a, b) => {
      if (a.isAvailable !== b.isAvailable) {
        return b.isAvailable ? 1 : -1;
      }
      if (a.matchedCount !== b.matchedCount) {
        return b.matchedCount - a.matchedCount;
      }
      return b.score - a.score;
    })
    .map(item => item.recipe);

  return {
    exactMatches: [],
    recommendations,
    hasExactMatch: false,
    hasMore: false,
    searchType,
  };
}
