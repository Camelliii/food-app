import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storage } from '../utils/storage';
import { checkRecipeAvailability } from '../utils/helpers';
import { Recipe, Ingredient, TodayMenuItem } from '../types';
import { loadRecipesFromJSON } from '../utils/recipeDataLoader';
import RecipeImage from '../components/RecipeImage';

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
        // 从 JSON 文件加载菜谱数据
        const recipesData = loadRecipesFromJSON();
        const [ingredientsData, menuData] = await Promise.all([
          Promise.resolve(storage.getIngredients()),
          Promise.resolve(storage.getTodayMenu()),
        ]);
        
        const foundRecipe = recipesData.find(r => r.id === id);
        setRecipe(foundRecipe || null);
        setIngredients(ingredientsData);
        setTodayMenu(menuData);
      } catch (error) {
        console.error('加载数据失败:', error);
        setRecipe(null);
        setIngredients(storage.getIngredients());
        setTodayMenu(storage.getTodayMenu());
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // 监听数据更新（仅更新菜单和食材）
    const handleStorageUpdate = async () => {
      try {
        const [ingredientsData, menuData] = await Promise.all([
          Promise.resolve(storage.getIngredients()),
          Promise.resolve(storage.getTodayMenu()),
        ]);
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
  
  // 获取原始数据（如果存在）
  const originalData = (recipe as any)?._originalData;

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

  return (
    <div>
      <button 
        className="btn btn-outline" 
        onClick={() => navigate('/recipes')}
        style={{ marginBottom: '1.5rem' }}
      >
        ← 返回
      </button>

      {/* 封面图片 */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: 0, overflow: 'hidden', border: 'none' }}>
        <RecipeImage
          recipe={recipe}
          style={{
            width: '100%',
            height: '300px',
            objectFit: 'cover'
          }}
        />
      </div>

      {/* 菜名 */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.75rem', margin: 0, flex: 1, fontWeight: 700 }}>{recipe.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {/* 展示所有原始分类 */}
          {originalData?.categories && originalData.categories.length > 0 ? (
            originalData.categories.map((cat: string) => (
              <span key={cat} className="badge badge-info">{cat}</span>
            ))
          ) : (
            recipe.category.map(cat => (
              <span key={cat} className="badge badge-info">{cat}</span>
            ))
          )}
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
          style={{ width: '100%', padding: '1rem' }}
        >
          {isInMenu ? '已在菜单中' : '加入菜单'}
        </button>
      </div>

      {/* 描述 */}
      {recipe.description && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>简介</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>{recipe.description}</p>
        </div>
      )}

      {/* 食材明细 */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>食材明细</h2>
        
        {/* 主料 */}
        {originalData?.main_ingredients && originalData.main_ingredients.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>主料</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {originalData.main_ingredients.map((ing: any, index: number) => {
                const stock = ingredients.find(i => i.name === ing.name);
                const hasEnough = stock?.isStaple || (stock && stock.quantity >= (parseFloat(ing.amount) || 0));
                const displayAmount = ing.amount === '适量' || ing.amount === '少许' || ing.amount === '适当' || ing.amount === '若干' ? '适量' : ing.amount;
                const displayUnit = ing.amount === '适量' || ing.amount === '少许' || ing.amount === '适当' || ing.amount === '若干' ? '' : (ing.unit || '');
                
                return (
                  <li 
                    key={index}
                    style={{
                      padding: '0.875rem',
                      marginBottom: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: hasEnough ? 'var(--success-bg)' : 'var(--warning-bg)',
                      border: `1px solid ${hasEnough ? 'transparent' : 'rgba(253, 203, 110, 0.3)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ing.name}
                      </span>
                      <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                        {displayAmount} {displayUnit}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>
                      {stock ? (
                        <span style={{ color: 'var(--success-color)', fontWeight: 500 }}>
                          {stock.isStaple ? '常备' : `库存: ${stock.quantity}${stock.unit}`}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--danger-color)', fontWeight: 600 }}>缺货</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* 辅料 */}
        {originalData?.auxiliary_ingredients && originalData.auxiliary_ingredients.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>辅料</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {originalData.auxiliary_ingredients.map((ing: any, index: number) => {
                const stock = ingredients.find(i => i.name === ing.name);
                const hasEnough = stock?.isStaple || (stock && stock.quantity >= (parseFloat(ing.amount) || 0));
                const displayAmount = ing.amount === '适量' || ing.amount === '少许' || ing.amount === '适当' || ing.amount === '若干' ? '适量' : ing.amount;
                const displayUnit = ing.amount === '适量' || ing.amount === '少许' || ing.amount === '适当' || ing.amount === '若干' ? '' : (ing.unit || '');
                
                return (
                  <li 
                    key={index}
                    style={{
                      padding: '0.875rem',
                      marginBottom: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: hasEnough ? 'var(--success-bg)' : 'var(--warning-bg)',
                      border: `1px solid ${hasEnough ? 'transparent' : 'rgba(253, 203, 110, 0.3)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ing.name}
                      </span>
                      <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                        {displayAmount} {displayUnit}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>
                      {stock ? (
                        <span style={{ color: 'var(--success-color)', fontWeight: 500 }}>
                          {stock.isStaple ? '常备' : `库存: ${stock.quantity}${stock.unit}`}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--danger-color)', fontWeight: 600 }}>缺货</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* 调料 */}
        {originalData?.seasonings && originalData.seasonings.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>调料</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {originalData.seasonings.map((ing: any, index: number) => {
                const stock = ingredients.find(i => i.name === ing.name);
                const hasEnough = stock?.isStaple || (stock && stock.quantity >= (parseFloat(ing.amount) || 0));
                const displayAmount = ing.amount === '适量' || ing.amount === '少许' || ing.amount === '适当' || ing.amount === '若干' ? '适量' : ing.amount;
                const displayUnit = ing.amount === '适量' || ing.amount === '少许' || ing.amount === '适当' || ing.amount === '若干' ? '' : (ing.unit || '');
                
                return (
                  <li 
                    key={index}
                    style={{
                      padding: '0.875rem',
                      marginBottom: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: hasEnough ? 'var(--success-bg)' : 'var(--warning-bg)',
                      border: `1px solid ${hasEnough ? 'transparent' : 'rgba(253, 203, 110, 0.3)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ing.name}
                      </span>
                      <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>
                        {displayAmount} {displayUnit}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>
                      {stock ? (
                        <span style={{ color: 'var(--success-color)', fontWeight: 500 }}>
                          {stock.isStaple ? '常备' : `库存: ${stock.quantity}${stock.unit}`}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--danger-color)', fontWeight: 600 }}>缺货</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* 制作信息 */}
      {(recipe.taste || recipe.craft || recipe.time || recipe.difficulty || originalData?.tools) && (
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
            {originalData?.tools && (
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>使用的厨具</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{originalData.tools}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 做法步骤 */}
      {recipe.steps && recipe.steps.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
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
                <div style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                  {step.description}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 小窍门 */}
      {originalData?.tips && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>小窍门</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
            {originalData.tips}
          </p>
        </div>
      )}
    </div>
  );
}

