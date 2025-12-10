import { Recipe, Ingredient, ShoppingItem, ConsumptionItem, TodayMenuItem } from '../types';

// 检查菜谱所需食材是否齐全
export function checkRecipeAvailability(recipe: Recipe, ingredients: Ingredient[]): {
  available: boolean;
  missingCount: number;
  missingItems: string[];
} {
  const missingItems: string[] = [];
  
  for (const recipeIngredient of recipe.ingredients) {
    const stock = ingredients.find(ing => ing.id === recipeIngredient.ingredientId);
    
    // 常备物品跳过检查
    if (stock?.isStaple) continue;
    
    // 检查库存是否充足
    if (!stock || stock.quantity < recipeIngredient.quantity) {
      missingItems.push(recipeIngredient.ingredientName);
    }
  }
  
  return {
    available: missingItems.length === 0,
    missingCount: missingItems.length,
    missingItems,
  };
}

// 根据今日菜单生成采购清单（使用名称匹配）
export function generateShoppingList(
  menu: TodayMenuItem[],
  ingredients: Ingredient[]
): ShoppingItem[] {
  const shoppingMap = new Map<string, ShoppingItem>();
  
  menu.forEach(item => {
    item.recipe.ingredients.forEach(recipeIngredient => {
      // 使用名称匹配，因为ID可能不一致
      const stock = ingredients.find(ing => ing.name === recipeIngredient.ingredientName);
      
      // 常备物品不加入采购清单
      if (stock?.isStaple) return;
      
      // 检查是否需要购买
      const requiredQuantity = recipeIngredient.quantity || 0;
      if (!stock || stock.quantity < requiredQuantity) {
        const existing = shoppingMap.get(recipeIngredient.ingredientName);
        if (existing) {
          // 如果已存在，取所需数量的最大值
          existing.quantity = Math.max(existing.quantity, requiredQuantity);
          if (existing.recipeNames && !existing.recipeNames.includes(item.recipe.name)) {
            existing.recipeNames.push(item.recipe.name);
          }
        } else {
          shoppingMap.set(recipeIngredient.ingredientName, {
            id: `shop_${Date.now()}_${Math.random()}`,
            name: recipeIngredient.ingredientName,
            quantity: requiredQuantity,
            unit: recipeIngredient.unit,
            fromRecipe: true,
            recipeNames: [item.recipe.name],
            purchased: false,
          });
        }
      }
    });
  });
  
  return Array.from(shoppingMap.values());
}

/**
 * 生成库存消耗清单（使用名称匹配）
 * 注意：常备食材（isStaple === true）的 afterConsumption 等于 currentStock，表示不扣减
 */
export function generateConsumptionList(
  recipe: Recipe,
  ingredients: Ingredient[]
): ConsumptionItem[] {
  return recipe.ingredients.map(recipeIngredient => {
    // 使用名称匹配，因为ID可能不一致
    const stock = ingredients.find(ing => ing.name === recipeIngredient.ingredientName);
    const currentStock = stock?.quantity || 0;
    const currentUnit = stock?.unit || recipeIngredient.unit;
    const isStaple = stock?.isStaple || false;
    
    // 常备物品不扣减库存，消耗后数量等于当前库存
    const requiredQuantity = recipeIngredient.quantity || 0;
    const afterConsumption = isStaple ? currentStock : Math.max(0, currentStock - requiredQuantity);
    
    return {
      ingredientId: recipeIngredient.ingredientId,
      ingredientName: recipeIngredient.ingredientName,
      currentStock,
      currentUnit,
      requiredQuantity,
      requiredUnit: recipeIngredient.unit,
      afterConsumption,
      isStaple,
    };
  });
}

/**
 * 消耗库存（使用名称匹配）
 * 注意：
 * 1. 常备食材（isStaple === true）不参与库存扣减，数量保持不变
 * 2. 非常备食材数量归0时，会自动从库存中删除
 */
export function consumeIngredients(
  recipe: Recipe,
  ingredients: Ingredient[]
): Ingredient[] {
  const result = ingredients.map(ing => {
    // 使用名称匹配，因为ID可能不一致
    const recipeIngredient = recipe.ingredients.find(ri => ri.ingredientName === ing.name);
    if (!recipeIngredient) {
      return ing; // 菜谱不需要此食材，保持不变
    }
    
    // 常备物品不扣减库存，直接返回原对象
    if (ing.isStaple) {
      return ing;
    }
    
    // 扣减数量（仅对非常备物品）
    const requiredQuantity = recipeIngredient.quantity || 0;
    return {
      ...ing,
      quantity: Math.max(0, ing.quantity - requiredQuantity),
    };
  });
  
  // 删除数量为0的非常备食材
  return removeZeroQuantityIngredients(result);
}

/**
 * 清理数量为0的非常备食材
 * 如果食材不是常备食材且数量为0，则从列表中删除
 */
export function removeZeroQuantityIngredients(ingredients: Ingredient[]): Ingredient[] {
  return ingredients.filter(ing => {
    // 常备食材保留，即使数量为0
    if (ing.isStaple) {
      return true;
    }
    // 非常备食材：数量为0时删除
    return ing.quantity > 0;
  });
}

// 将采购清单入库
export function addShoppingItemsToInventory(
  shoppingList: ShoppingItem[],
  ingredients: Ingredient[]
): Ingredient[] {
  const updatedIngredients = [...ingredients];
  const ingredientMap = new Map(ingredients.map(ing => [ing.name, ing]));
  
  shoppingList
    .filter(item => item.purchased)
    .forEach(item => {
      const existing = ingredientMap.get(item.name);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        // 新建食材（需要用户指定分类）
        const newIngredient = {
          id: `ing_${Date.now()}_${Math.random()}`,
          name: item.name,
          category: '其他' as const,
          quantity: item.quantity,
          unit: item.unit,
        };
        updatedIngredients.push(newIngredient);
        ingredientMap.set(item.name, newIngredient);
      }
    });
  
  return updatedIngredients;
}

