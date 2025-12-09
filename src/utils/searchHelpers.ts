import { Recipe, RecipeCategory, Ingredient } from '../types';
import { checkRecipeAvailability } from './helpers';

/**
 * 计算搜索相关性分数
 */
export function calculateRelevanceScore(recipe: Recipe, query: string): number {
  if (!query || query.trim() === '') return 0;
  
  const lowerQuery = query.toLowerCase().trim();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);
  
  let score = 0;
  
  // 1. 菜名完全匹配（最高分）
  if (recipe.name.toLowerCase() === lowerQuery) {
    score += 1000;
  }
  // 菜名开头匹配
  else if (recipe.name.toLowerCase().startsWith(lowerQuery)) {
    score += 500;
  }
  // 菜名包含（按位置加权）
  else if (recipe.name.toLowerCase().includes(lowerQuery)) {
    const index = recipe.name.toLowerCase().indexOf(lowerQuery);
    score += 300 - index * 2; // 越靠前分数越高
  }
  
  // 2. 多关键词匹配（菜名）
  queryWords.forEach((word, index) => {
    if (recipe.name.toLowerCase().includes(word)) {
      score += 200 - index * 10; // 第一个词权重更高
    }
  });
  
  // 3. 描述匹配
  if (recipe.description) {
    const descLower = recipe.description.toLowerCase();
    if (descLower.includes(lowerQuery)) {
      score += 100;
    }
    queryWords.forEach(word => {
      if (descLower.includes(word)) {
        score += 30;
      }
    });
  }
  
  // 4. 食材匹配（重要：搜索食材时优先显示）
  const ingredientMatches = recipe.ingredients.filter(ing => 
    ing.ingredientName.toLowerCase().includes(lowerQuery) ||
    queryWords.some(word => ing.ingredientName.toLowerCase().includes(word))
  );
  
  if (ingredientMatches.length > 0) {
    // 匹配的食材数量越多，分数越高
    score += 150 * ingredientMatches.length;
    
    // 如果所有关键词都匹配到食材，额外加分
    const allWordsMatched = queryWords.every(word =>
      recipe.ingredients.some(ing => ing.ingredientName.toLowerCase().includes(word))
    );
    if (allWordsMatched) {
      score += 200;
    }
  }
  
  // 5. 标签匹配
  if (recipe.tags && recipe.tags.length > 0) {
    recipe.tags.forEach(tag => {
      if (tag.toLowerCase().includes(lowerQuery)) {
        score += 80;
      }
      queryWords.forEach(word => {
        if (tag.toLowerCase().includes(word)) {
          score += 20;
        }
      });
    });
  }
  
  // 6. 分类匹配
  if (recipe.category && recipe.category.length > 0) {
    recipe.category.forEach(cat => {
      if (cat.toLowerCase().includes(lowerQuery)) {
        score += 50;
      }
    });
  }
  
  return score;
}

/**
 * 判断搜索是否主要是食材搜索
 */
export function isIngredientSearch(query: string, recipes: Recipe[]): boolean {
  if (!query || query.trim() === '') return false;
  
  const lowerQuery = query.toLowerCase().trim();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);
  
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
  return ingredientMatches > nameMatches * 1.5;
}

/**
 * 智能搜索和排序菜谱
 */
export function searchAndSortRecipes(
  recipes: Recipe[],
  query: string,
  selectedCategory: RecipeCategory
): Recipe[] {
  if (!query || query.trim() === '') {
    // 没有搜索词时，只按分类筛选
    if (selectedCategory === '全部') {
      return recipes;
    }
    return recipes.filter(recipe => 
      recipe.category && recipe.category.includes(selectedCategory as RecipeCategory)
    );
  }
  
  const lowerQuery = query.toLowerCase().trim();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);
  
  // 判断是否是食材搜索
  const isIngredientSearchMode = isIngredientSearch(query, recipes);
  
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
      const nameMatch = recipe.name.toLowerCase().includes(lowerQuery);
      const descMatch = recipe.description?.toLowerCase().includes(lowerQuery);
      const ingredientMatch = recipe.ingredients.some(ing =>
        ing.ingredientName.toLowerCase().includes(lowerQuery) ||
        queryWords.some(word => ing.ingredientName.toLowerCase().includes(word))
      );
      const tagMatch = recipe.tags?.some(tag =>
        tag.toLowerCase().includes(lowerQuery) ||
        queryWords.some(word => tag.toLowerCase().includes(word))
      );
      
      // 如果没有任何匹配，跳过
      if (!nameMatch && !descMatch && !ingredientMatch && !tagMatch) {
        return { recipe, score: -1 };
      }
      
      // 计算相关性分数
      let score = calculateRelevanceScore(recipe, query);
      
      // 如果是食材搜索模式，提高食材匹配的权重
      if (isIngredientSearchMode && ingredientMatch) {
        score += 300;
        
        // 匹配的食材数量越多，分数越高
        const matchedIngredients = recipe.ingredients.filter(ing =>
          queryWords.some(word => ing.ingredientName.toLowerCase().includes(word))
        );
        score += matchedIngredients.length * 100;
      }
      
      // 如果是菜名搜索模式，提高菜名匹配的权重
      if (!isIngredientSearchMode && nameMatch) {
        score += 200;
      }
      
      return { recipe, score };
    })
    .filter(item => item.score >= 0) // 过滤掉不匹配的
    .sort((a, b) => b.score - a.score); // 按分数降序排序
  
  return scoredRecipes.map(item => item.recipe);
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
      hasExactMatch: true, // 标记为有结果，这样不会显示"未找到"
      hasMore: sortedResult.hasMore,
    };
  }

  const lowerQuery = query.toLowerCase().trim();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0);
  
  // 判断是否是食材搜索
  const isIngredientSearchMode = isIngredientSearch(query, recipes);
  
  // 如果不是食材搜索，使用原来的逻辑
  if (!isIngredientSearchMode) {
    const results = searchAndSortRecipes(recipes, query, selectedCategory);
    return {
      exactMatches: results,
      recommendations: [],
      hasExactMatch: results.length > 0,
      hasMore: false,
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
      // 基础分数：匹配的食材数量（越多越好）
      let score = matchedCount * 1000;
      
      // 如果食材齐全，额外加分（优先推荐）
      if (isAvailable) {
        score += 5000;
      }
      
      // 匹配的食材比例越高，分数越高
      const matchRatio = matchedCount / queryWords.length;
      score += matchRatio * 2000;

      return {
        recipe,
        matchedCount,
        score,
        isAvailable,
      };
    })
    .filter(item => item.score >= 0) // 至少匹配一个食材
    .sort((a, b) => {
      // 排序规则：
      // 1. 食材齐全的优先
      if (a.isAvailable !== b.isAvailable) {
        return b.isAvailable ? 1 : -1;
      }
      // 2. 匹配食材数量多的优先
      if (a.matchedCount !== b.matchedCount) {
        return b.matchedCount - a.matchedCount;
      }
      // 3. 分数高的优先
      return b.score - a.score;
    })
    .map(item => item.recipe);

  return {
    exactMatches: [],
    recommendations,
    hasExactMatch: false,
    hasMore: false,
  };
}
