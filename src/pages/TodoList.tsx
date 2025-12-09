import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { storage } from '../utils/storage';
import { generateShoppingList, generateConsumptionList, consumeIngredients } from '../utils/helpers';
import ConsumptionModal from '../components/ConsumptionModal';

export default function TodoList() {
  const navigate = useNavigate();
  const [todayMenu, setTodayMenu] = useState(storage.getTodayMenu());
  const [shoppingList, setShoppingList] = useState(storage.getShoppingList());
  const [ingredients, setIngredients] = useState(storage.getIngredients());
  const [recipes] = useState(storage.getRecipes());
  const [activeTab, setActiveTab] = useState<'menu' | 'shopping'>('menu');
  const [consumptionRecipe, setConsumptionRecipe] = useState<typeof recipes[0] | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');

  // 更新采购清单
  useEffect(() => {
    const newShoppingList = generateShoppingList(todayMenu, ingredients);
    // 保留手动添加的项目
    const manualItems = shoppingList.filter(item => !item.fromRecipe);
    const updatedList = [...newShoppingList, ...manualItems];
    setShoppingList(updatedList);
    storage.saveShoppingList(updatedList);
  }, [todayMenu, ingredients]);

  const handleToggleComplete = (recipeId: string) => {
    setTodayMenu(prev =>
      prev.map(item =>
        item.recipeId === recipeId
          ? { ...item, completed: !item.completed }
          : item
      )
    );
    storage.saveTodayMenu(todayMenu.map(item =>
      item.recipeId === recipeId
        ? { ...item, completed: !item.completed }
        : item
    ));
  };

  const handleConsume = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (recipe) {
      setConsumptionRecipe(recipe);
    }
  };

  const handleConfirmConsumption = () => {
    if (!consumptionRecipe) return;

    const updatedIngredients = consumeIngredients(consumptionRecipe, ingredients);
    setIngredients(updatedIngredients);
    storage.saveIngredients(updatedIngredients);

    // 从菜单中移除已消耗的菜谱
    const updatedMenu = todayMenu.filter(item => item.recipeId !== consumptionRecipe.id);
    setTodayMenu(updatedMenu);
    storage.saveTodayMenu(updatedMenu);

    setConsumptionRecipe(null);
  };

  const handleRemoveFromMenu = (recipeId: string) => {
    const updatedMenu = todayMenu.filter(item => item.recipeId !== recipeId);
    setTodayMenu(updatedMenu);
    storage.saveTodayMenu(updatedMenu);
  };

  const handleTogglePurchase = (itemId: string) => {
    const updatedList = shoppingList.map(item =>
      item.id === itemId ? { ...item, purchased: !item.purchased } : item
    );
    setShoppingList(updatedList);
    storage.saveShoppingList(updatedList);
  };

  const handleRemoveShoppingItem = (itemId: string) => {
    const updatedList = shoppingList.filter(item => item.id !== itemId);
    setShoppingList(updatedList);
    storage.saveShoppingList(updatedList);
  };

  const handleAddManualItem = () => {
    if (!newItemName.trim()) return;

    const newItem = {
      id: `manual_${Date.now()}_${Math.random()}`,
      name: newItemName,
      quantity: parseFloat(newItemQuantity) || 1,
      unit: newItemUnit || '个',
      fromRecipe: false,
      purchased: false,
    };

    const updatedList = [...shoppingList, newItem];
    setShoppingList(updatedList);
    storage.saveShoppingList(updatedList);

    setNewItemName('');
    setNewItemQuantity('');
    setNewItemUnit('');
    setShowAddItem(false);
  };

  const handleOneClickInbound = () => {
    const purchasedItems = shoppingList.filter(item => item.purchased);
    if (purchasedItems.length === 0) {
      alert('请先标记已购买的物品');
      return;
    }

    const updatedIngredients = [...ingredients];
    
    purchasedItems.forEach(item => {
      const existing = updatedIngredients.find(ing => ing.name === item.name);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        updatedIngredients.push({
          id: `ing_${Date.now()}_${Math.random()}`,
          name: item.name,
          category: '其他',
          quantity: item.quantity,
          unit: item.unit,
        });
      }
    });

    setIngredients(updatedIngredients);
    storage.saveIngredients(updatedIngredients);

    // 从采购清单中移除已入库的物品
    const remainingList = shoppingList.filter(item => !item.purchased);
    setShoppingList(remainingList);
    storage.saveShoppingList(remainingList);
  };

  return (
    <div>
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => setActiveTab('menu')}
        >
          今日菜单
        </button>
        <button
          className={`tab ${activeTab === 'shopping' ? 'active' : ''}`}
          onClick={() => setActiveTab('shopping')}
        >
          采购清单
        </button>
      </div>

      {activeTab === 'menu' && (
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.5rem' }}>今日菜单</h2>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/recipes')}
            >
              添加菜谱
            </button>
          </div>

          {todayMenu.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <p style={{ marginBottom: '1rem' }}>今日菜单为空</p>
              <button className="btn btn-primary" onClick={() => navigate('/recipes')}>
                去添加菜谱
              </button>
            </div>
          ) : (
            <div>
              {todayMenu.map(item => (
                <div key={item.recipeId} className="card" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleComplete(item.recipeId)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                        {item.recipe.name}
                      </h3>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        ⏱️ {item.recipe.cookTime}分钟 · 👥 {item.recipe.servings}人份
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {item.completed && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleConsume(item.recipeId)}
                        >
                          开饭
                        </button>
                      )}
                      <button
                        className="btn btn-outline"
                        onClick={() => handleRemoveFromMenu(item.recipeId)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'shopping' && (
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.5rem' }}>采购清单</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                onClick={handleOneClickInbound}
                disabled={shoppingList.filter(item => item.purchased).length === 0}
              >
                一键入库
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddItem(!showAddItem)}
              >
                <Plus size={16} style={{ marginRight: '0.25rem' }} />
                记一笔
              </button>
            </div>
          </div>

          {showAddItem && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>添加物品</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                <input
                  type="text"
                  placeholder="物品名称"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="search-bar"
                  style={{ marginBottom: 0 }}
                />
                <input
                  type="number"
                  placeholder="数量"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                  className="search-bar"
                  style={{ marginBottom: 0 }}
                />
                <input
                  type="text"
                  placeholder="单位"
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  className="search-bar"
                  style={{ marginBottom: 0 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAddManualItem}
                >
                  添加
                </button>
              </div>
            </div>
          )}

          {shoppingList.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              采购清单为空
            </div>
          ) : (
            <div>
              {shoppingList.map(item => (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    marginBottom: '1rem',
                    opacity: item.purchased ? 0.6 : 1,
                    textDecoration: item.purchased ? 'line-through' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={item.purchased}
                      onChange={() => handleTogglePurchase(item.id)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 500, fontSize: '1.125rem' }}>
                          {item.name}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {item.quantity}{item.unit}
                        </span>
                        {item.fromRecipe && (
                          <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                            ○ 食谱所需
                          </span>
                        )}
                      </div>
                      {item.recipeNames && item.recipeNames.length > 0 && (
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          来自: {item.recipeNames.join('、')}
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleRemoveShoppingItem(item.id)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {consumptionRecipe && (
        <ConsumptionModal
          recipe={consumptionRecipe}
          onConfirm={handleConfirmConsumption}
          onCancel={() => setConsumptionRecipe(null)}
        />
      )}
    </div>
  );
}

