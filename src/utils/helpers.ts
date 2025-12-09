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

// 根据今日菜单生成采购清单
export function generateShoppingList(
  menu: TodayMenuItem[],
  ingredients: Ingredient[]
): ShoppingItem[] {
  const shoppingMap = new Map<string, ShoppingItem>();
  
  menu.forEach(item => {
    item.recipe.ingredients.forEach(recipeIngredient => {
      // 常备物品不加入采购清单
      const stock = ingredients.find(ing => ing.id === recipeIngredient.ingredientId);
      if (stock?.isStaple) return;
      
      // 检查是否需要购买
      if (!stock || stock.quantity < recipeIngredient.quantity) {
        const existing = shoppingMap.get(recipeIngredient.ingredientName);
        if (existing) {
          existing.quantity = Math.max(existing.quantity, recipeIngredient.quantity);
          existing.recipeNames?.push(item.recipe.name);
        } else {
          shoppingMap.set(recipeIngredient.ingredientName, {
            id: `shop_${Date.now()}_${Math.random()}`,
            name: recipeIngredient.ingredientName,
            quantity: recipeIngredient.quantity,
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

// 生成库存消耗清单
export function generateConsumptionList(
  recipe: Recipe,
  ingredients: Ingredient[]
): ConsumptionItem[] {
  return recipe.ingredients.map(recipeIngredient => {
    const stock = ingredients.find(ing => ing.id === recipeIngredient.ingredientId);
    const currentStock = stock?.quantity || 0;
    const currentUnit = stock?.unit || recipeIngredient.unit;
    const isStaple = stock?.isStaple || false;
    
    // 常备物品不扣减库存
    const afterConsumption = isStaple ? currentStock : Math.max(0, currentStock - recipeIngredient.quantity);
    
    return {
      ingredientId: recipeIngredient.ingredientId,
      ingredientName: recipeIngredient.ingredientName,
      currentStock,
      currentUnit,
      requiredQuantity: recipeIngredient.quantity,
      requiredUnit: recipeIngredient.unit,
      afterConsumption,
      isStaple,
    };
  });
}

// 消耗库存
export function consumeIngredients(
  recipe: Recipe,
  ingredients: Ingredient[]
): Ingredient[] {
  return ingredients.map(ing => {
    const recipeIngredient = recipe.ingredients.find(ri => ri.ingredientId === ing.id);
    if (!recipeIngredient) return ing;
    
    // 常备物品不扣减
    if (ing.isStaple) return ing;
    
    return {
      ...ing,
      quantity: Math.max(0, ing.quantity - recipeIngredient.quantity),
    };
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

