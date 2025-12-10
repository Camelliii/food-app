import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Lightbulb } from 'lucide-react';
import { storage } from '../utils/storage';
import { checkRecipeAvailability } from '../utils/helpers';
import { getRecommendedRecipes, sortRecipesByAvailability } from '../utils/searchHelpers';
import { RecipeCategory, Recipe, Ingredient, TodayMenuItem } from '../types';
import { loadRecipesFromJSON } from '../utils/recipeDataLoader';
import RecipeImage from '../components/RecipeImage';

export default function RecipeHome() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [todayMenu, setTodayMenu] = useState<TodayMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory>('全部');
  const [showAllRecipes, setShowAllRecipes] = useState(false); // 是否显示所有菜谱

  const categories: RecipeCategory[] = ['全部', '热菜', '凉菜', '汤羹', '主食', '小吃', '西餐', '烘焙', '饮品', '泡酱腌菜', '其它'];

  // 当搜索词或分类改变时，重置"查看更多"状态
  useEffect(() => {
    setShowAllRecipes(false);
  }, [searchQuery, selectedCategory]);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        // 从 JSON 文件加载菜谱数据
        const recipesData = loadRecipesFromJSON();
        const [ingredientsData, menuData] = await Promise.all([
          Promise.resolve(storage.getIngredients()),
          Promise.resolve(storage.getTodayMenu()),
        ]);
        setRecipes(recipesData);
        setIngredients(ingredientsData);
        setTodayMenu(menuData);
      } catch (error) {
        console.error('加载数据失败:', error);
        setRecipes([]);
        setIngredients(storage.getIngredients());
        setTodayMenu(storage.getTodayMenu());
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // 监听storage事件，当数据更新时重新加载（仅更新菜单和食材）
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

    // 监听自定义storage事件
    window.addEventListener('storage-update', handleStorageUpdate);

    return () => {
      window.removeEventListener('storage-update', handleStorageUpdate);
    };
  }, []);

  const searchResults = useMemo(() => {
    // 先按分类过滤
    let filteredRecipes = recipes;
    if (selectedCategory !== '全部') {
      filteredRecipes = recipes.filter(recipe => 
        recipe.category.includes(selectedCategory)
      );
    }
    
    // 如果有搜索词，使用智能搜索
    if (searchQuery.trim()) {
      return getRecommendedRecipes(filteredRecipes, searchQuery, '全部', ingredients, showAllRecipes);
    }
    
    // 没有搜索词时，按缺少食材种类排序（首页推荐逻辑）
    const sortedResult = sortRecipesByAvailability(filteredRecipes, ingredients, showAllRecipes);
    
    return {
      hasExactMatch: true,
      exactMatches: sortedResult.displayed,
      recommendations: [],
      hasMore: sortedResult.hasMore,
    };
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
              color: 'var(--text-tertiary)'
            }} 
          />
          <input
            type="text"
            className="search-bar"
            placeholder="搜索菜谱名称、分类或食材（如：宫保鸡丁、热菜、鸡蛋）..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '3rem', marginBottom: 0 }}
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

      {/* 显示搜索类型提示 */}
      {searchQuery.trim() !== '' && searchResults.searchType && searchResults.searchType !== 'none' && (
        <div style={{ marginBottom: '1rem' }}>
          <span className="badge badge-info" style={{ 
            borderRadius: 'var(--radius-full)', 
            padding: '0.5rem 1rem', 
            fontSize: '0.875rem',
            backgroundColor: '#f5f2eb',
            color: 'var(--text-secondary)',
            border: '1px solid rgba(0, 0, 0, 0.08)'
          }}>
            {searchResults.searchType === 'name' && '按菜名搜索'}
            {searchResults.searchType === 'category' && '按分类搜索'}
            {searchResults.searchType === 'ingredient' && '按食材搜索'}
          </span>
        </div>
      )}

      {/* 显示"未找到完全匹配"提示（有近似结果时） */}
      {!searchResults.hasExactMatch && searchResults.recommendations.length > 0 && searchQuery.trim() !== '' && (
        <div className="card" style={{ 
          marginBottom: '2rem', 
          backgroundColor: '#f5f2eb',
          border: '1px solid rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Search size={20} color="var(--warning-color)" />
            <h3 style={{ margin: 0, color: '#d48806' }}>
              {searchResults.searchType === 'ingredient' ? '未找到包含所有食材的菜谱' : '未找到完全匹配的菜谱'}
            </h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            {searchResults.searchType === 'ingredient' 
              ? '没有找到同时包含所有搜索食材的菜谱，为您推荐相关菜谱' 
              : '为您推荐相似的菜谱'}
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
          
          return (
            <div key={recipe.id} style={{ position: 'relative' }}>
              <Link
                to={`/recipes/${recipe.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="card recipe-card" style={{ 
                  cursor: 'pointer', 
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  border: 'none',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: 'calc(100% + 3rem)', 
                    margin: '-1.5rem -1.5rem 1rem -1.5rem',
                    height: '200px', 
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: '#f5f2eb',
                  }}>
                    <RecipeImage
                      recipe={recipe}
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                    />
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
                    {recipe.cookTime > 0 && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {recipe.cookTime}分
                      </span>
                    )}
                  </div>
                  
                  {recipe.tags && recipe.tags.length > 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {recipe.tags.join('，')}
                    </p>
                  )}
                </div>
              </Link>
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
        <div style={{ textAlign: 'center', marginTop: '2rem', paddingBottom: '2rem' }}>
          <button
            onClick={() => setShowAllRecipes(true)}
            className="btn btn-primary"
            style={{ padding: '0.75rem 2.5rem' }}
          >
            查看更多（缺3样及以上）
          </button>
        </div>
      )}

      {/* 显示"收起"按钮（当显示所有菜谱时） */}
      {searchQuery.trim() === '' && showAllRecipes && (
        <div style={{ textAlign: 'center', marginTop: '2rem', paddingBottom: '2rem' }}>
          <button
            onClick={() => setShowAllRecipes(false)}
            className="btn btn-outline"
            style={{ padding: '0.75rem 2.5rem' }}
          >
            收起
          </button>
        </div>
      )}
    </div>
  );
}

