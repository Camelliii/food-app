import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Lightbulb, Trash2 } from 'lucide-react';
import { storage } from '../utils/storage';
import { checkRecipeAvailability } from '../utils/helpers';
import { getRecommendedRecipes } from '../utils/searchHelpers';
import { RecipeCategory, Recipe, Ingredient, TodayMenuItem } from '../types';

export default function RecipeHome() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [todayMenu, setTodayMenu] = useState<TodayMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory>('全部');
  const [showAllRecipes, setShowAllRecipes] = useState(false); // 是否显示所有菜谱

  const categories: RecipeCategory[] = ['全部', '热菜', '养生', '烘焙', '小吃', '饮品', '其他'];

  // 当搜索词或分类改变时，重置"查看更多"状态
  useEffect(() => {
    setShowAllRecipes(false);
  }, [searchQuery, selectedCategory]);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const [recipesData, ingredientsData, menuData] = await Promise.all([
          storage.getRecipes(),
          Promise.resolve(storage.getIngredients()), // 保持同步以兼容
          Promise.resolve(storage.getTodayMenu()), // 保持同步以兼容
        ]);
        setRecipes(recipesData);
        setIngredients(ingredientsData);
        setTodayMenu(menuData);
      } catch (error) {
        console.error('加载数据失败:', error);
        // 降级到同步方法
        setRecipes(storage.getRecipesSync());
        setIngredients(storage.getIngredients());
        setTodayMenu(storage.getTodayMenu());
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // 监听storage事件，当数据更新时重新加载
    const handleStorageUpdate = async () => {
      try {
        const [recipesData, ingredientsData, menuData] = await Promise.all([
          storage.getRecipes(),
          Promise.resolve(storage.getIngredients()),
          Promise.resolve(storage.getTodayMenu()),
        ]);
        setRecipes(recipesData);
        setIngredients(ingredientsData);
        setTodayMenu(menuData);
      } catch (error) {
        console.error('更新数据失败:', error);
      }
    };

    // 监听自定义storage事件
    window.addEventListener('storage-update', handleStorageUpdate);

    return () => {
      window.removeEventListener('storage-update', handleStorageUpdate);
    };
  }, []);

  const searchResults = useMemo(() => {
    // 使用智能搜索和推荐
    return getRecommendedRecipes(recipes, searchQuery, selectedCategory, ingredients, showAllRecipes);
  }, [recipes, selectedCategory, searchQuery, ingredients, showAllRecipes]);

  // 决定显示哪些菜谱
  const displayRecipes = searchResults.hasExactMatch 
    ? searchResults.exactMatches 
    : searchResults.recommendations;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ position: 'relative' }}>
          <Search 
            size={20} 
            style={{ 
              position: 'absolute', 
              left: '1rem', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#999'
            }} 
          />
          <input
            type="text"
            className="search-bar"
            placeholder="搜索菜谱名称或食材（如：宫保鸡丁、鸡蛋、鸡肉）..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '3rem' }}
          />
        </div>
      </div>

      <div className="tabs">
        {categories.map(category => (
          <button
            key={category}
            className={`tab ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* 显示"未找到菜谱"提示（仅当是食材搜索且没有完全匹配时） */}
      {!searchResults.hasExactMatch && searchQuery.trim() !== '' && (
        <div className="card" style={{ 
          marginBottom: '2rem', 
          backgroundColor: '#fff3cd',
          border: '1px solid #ffd43b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Search size={20} color="#b8860b" />
            <h3 style={{ margin: 0, color: '#b8860b' }}>未找到完全匹配的菜谱</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            没有找到同时包含所有搜索食材的菜谱
          </p>
        </div>
      )}

      {/* 显示"为您推荐"标题（仅当有推荐时） */}
      {!searchResults.hasExactMatch && searchResults.recommendations.length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lightbulb size={24} color="var(--primary-color)" />
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>为您推荐</h2>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {displayRecipes.map(recipe => {
          const availability = checkRecipeAvailability(recipe, ingredients);
          
          const handleDelete = async (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            
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
            } catch (error) {
              console.error('删除菜谱失败:', error);
              alert('删除失败，请重试');
            }
          };
          
          return (
            <div key={recipe.id} style={{ position: 'relative' }}>
              <Link
                to={`/recipes/${recipe.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
                  <div style={{ 
                    width: '100%', 
                    height: '180px', 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '2rem'
                  }}>
                    {recipe.name.charAt(0)}
                  </div>
                  
                  <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>
                    {recipe.name}
                  </h3>
                  
                  <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {availability.available ? (
                      <span className="badge badge-success">食材齐全</span>
                    ) : (
                      <span className="badge badge-warning">
                        ① 缺{availability.missingCount}样
                      </span>
                    )}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {recipe.cookTime}分
                    </span>
                  </div>
                  
                  {recipe.tags && recipe.tags.length > 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {recipe.tags.join('，')}
                    </p>
                  )}
                </div>
              </Link>
              <button
                onClick={handleDelete}
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  backgroundColor: 'rgba(255, 82, 82, 0.9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#d32f2f';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 82, 82, 0.9)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="删除菜谱"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {displayRecipes.length === 0 && searchQuery.trim() !== '' && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          没有找到相关菜谱
        </div>
      )}

      {displayRecipes.length === 0 && searchQuery.trim() === '' && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          暂无菜谱
        </div>
      )}

      {/* 显示"查看更多"按钮（仅在没有搜索词且有更多菜谱时） */}
      {searchQuery.trim() === '' && searchResults.hasMore && !showAllRecipes && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            onClick={() => setShowAllRecipes(true)}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#d32f2f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-color)';
            }}
          >
            查看更多（缺3样及以上）
          </button>
        </div>
      )}

      {/* 显示"收起"按钮（当显示所有菜谱时） */}
      {searchQuery.trim() === '' && showAllRecipes && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            onClick={() => setShowAllRecipes(false)}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              backgroundColor: 'var(--text-secondary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#666';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--text-secondary)';
            }}
          >
            收起
          </button>
        </div>
      )}
    </div>
  );
}

