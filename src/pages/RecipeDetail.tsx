import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storage } from '../utils/storage';
import { checkRecipeAvailability } from '../utils/helpers';
import { Recipe, Ingredient, TodayMenuItem } from '../types';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [todayMenu, setTodayMenu] = useState<TodayMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [recipesData, ingredientsData, menuData] = await Promise.all([
          storage.getRecipes(),
          Promise.resolve(storage.getIngredients()), // 保持同步以兼容
          Promise.resolve(storage.getTodayMenu()), // 保持同步以兼容
        ]);
        
        const foundRecipe = recipesData.find(r => r.id === id);
        setRecipe(foundRecipe || null);
        setIngredients(ingredientsData);
        setTodayMenu(menuData);
      } catch (error) {
        console.error('加载数据失败:', error);
        // 降级到同步方法
        const recipesSync = storage.getRecipesSync();
        const foundRecipe = recipesSync.find(r => r.id === id);
        setRecipe(foundRecipe || null);
        setIngredients(storage.getIngredients());
        setTodayMenu(storage.getTodayMenu());
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // 监听数据更新
    const handleStorageUpdate = async () => {
      try {
        const [recipesData, ingredientsData, menuData] = await Promise.all([
          storage.getRecipes(),
          Promise.resolve(storage.getIngredients()),
          Promise.resolve(storage.getTodayMenu()),
        ]);
        const foundRecipe = recipesData.find(r => r.id === id);
        setRecipe(foundRecipe || null);
        setIngredients(ingredientsData);
        setTodayMenu(menuData);
      } catch (error) {
        console.error('更新数据失败:', error);
      }
    };

    window.addEventListener('storage-update', handleStorageUpdate);
    return () => {
      window.removeEventListener('storage-update', handleStorageUpdate);
    };
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>加载中...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>菜谱不存在</p>
        <button className="btn btn-primary" onClick={() => navigate('/recipes')}>
          返回菜谱库
        </button>
      </div>
    );
  }

  const availability = checkRecipeAvailability(recipe, ingredients);
  const isInMenu = todayMenu.some(item => item.recipeId === recipe.id);

  const handleAddToMenu = () => {
    if (isInMenu) {
      alert('该菜谱已在今日菜单中');
      return;
    }
    
    const newMenu = [
      ...todayMenu,
      {
        recipeId: recipe.id,
        recipe,
        completed: false,
        addedAt: Date.now(),
      },
    ];
    
    storage.saveTodayMenu(newMenu);
    navigate('/todo');
  };

  const handleDeleteRecipe = async () => {
    if (!recipe) return;
    
    const confirmed = window.confirm(`确定要删除菜谱"${recipe.name}"吗？此操作不可撤销。`);
    if (!confirmed) return;
    
    try {
      // 获取所有菜谱
      const allRecipes = await storage.getRecipes();
      // 过滤掉要删除的菜谱
      const updatedRecipes = allRecipes.filter(r => r.id !== recipe.id);
      // 保存更新后的菜谱列表
      await storage.saveRecipes(updatedRecipes);
      
      // 如果该菜谱在今日菜单中，也要移除
      const updatedMenu = todayMenu.filter(item => item.recipeId !== recipe.id);
      storage.saveTodayMenu(updatedMenu);
      
      // 触发更新事件
      window.dispatchEvent(new Event('storage-update'));
      
      // 返回菜谱列表页
      navigate('/recipes');
    } catch (error) {
      console.error('删除菜谱失败:', error);
      alert('删除失败，请重试');
    }
  };

  return (
    <div>
      <button 
        className="btn btn-outline" 
        onClick={() => navigate('/recipes')}
        style={{ marginBottom: '1.5rem' }}
      >
        ← 返回
      </button>

      {/* 菜名 */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '2rem', margin: 0, flex: 1 }}>{recipe.name}</h1>
          <button
            className="btn btn-outline"
            onClick={handleDeleteRecipe}
            style={{
              marginLeft: '1rem',
              backgroundColor: '#ff5252',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#d32f2f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ff5252';
            }}
          >
            删除
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {recipe.category.map(cat => (
            <span key={cat} className="badge badge-info">{cat}</span>
          ))}
          {availability.available ? (
            <span className="badge badge-success">食材齐全</span>
          ) : (
            <span className="badge badge-warning">缺{availability.missingCount}样食材</span>
          )}
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleAddToMenu}
          disabled={isInMenu}
          style={{ width: '100%' }}
        >
          {isInMenu ? '已在菜单中' : '加入菜单'}
        </button>
      </div>

      {/* 食材明细 */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>食材明细</h2>
        
        {/* 主料和辅料 - 需要从ingredients中区分，这里简化处理，显示所有食材 */}
        {recipe.ingredients.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {recipe.ingredients.map((ing, index) => {
              const stock = ingredients.find(i => i.id === ing.ingredientId);
              const hasEnough = stock?.isStaple || (stock && stock.quantity >= ing.quantity);
              
              return (
                <li 
                  key={index}
                  style={{
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    borderRadius: '8px',
                    backgroundColor: hasEnough ? '#d3f9d8' : '#fff3bf',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500 }}>
                      {ing.ingredientName} {ing.quantity > 0 ? `${ing.quantity}${ing.unit}` : ing.unit}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {stock ? (
                        <>库存: {stock.isStaple ? '常备' : `${stock.quantity}${stock.unit}`}</>
                      ) : (
                        <span style={{ color: 'var(--danger-color)' }}>缺货</span>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 制作信息 */}
      {(recipe.taste || recipe.craft || recipe.time || recipe.difficulty) && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>制作信息</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            {recipe.taste && (
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>口味</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{recipe.taste}</div>
              </div>
            )}
            {recipe.craft && (
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>工艺</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{recipe.craft}</div>
              </div>
            )}
            {(recipe.time || recipe.cookTime) && (
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>耗时</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                  {recipe.time || `${recipe.cookTime}分钟`}
                </div>
              </div>
            )}
            {recipe.difficulty && (
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>难度</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{recipe.difficulty}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 做法步骤 */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>做法步骤</h2>
        <ol style={{ paddingLeft: '1.5rem' }}>
          {recipe.steps.map((step) => (
            <li 
              key={step.step}
              style={{
                marginBottom: '1.5rem',
                paddingLeft: '0.5rem',
                lineHeight: '1.6',
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                步骤 {step.step}
              </div>
              {step.image && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <img 
                    src={step.image} 
                    alt={`步骤 ${step.step}`}
                    style={{
                      maxWidth: '100%',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                {step.description}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

