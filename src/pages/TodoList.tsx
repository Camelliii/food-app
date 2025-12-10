import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { storage } from '../utils/storage';
import { generateShoppingList, generateConsumptionList, consumeIngredients, removeZeroQuantityIngredients } from '../utils/helpers';
import ConsumptionModal from '../components/ConsumptionModal';
import { getIngredientCategory } from '../utils/ingredientCategory';

export default function TodoList() {
  const navigate = useNavigate();
  const [todayMenu, setTodayMenu] = useState(storage.getTodayMenu());
  const [shoppingList, setShoppingList] = useState(storage.getShoppingList());
  const [ingredients, setIngredients] = useState(storage.getIngredients());
  const [activeTab, setActiveTab] = useState<'menu' | 'shopping'>('menu');
  const [consumptionRecipe, setConsumptionRecipe] = useState<any>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // 更新采购清单（仅当菜单或食材变化时，不包含已入库的食材）
  useEffect(() => {
    const currentShoppingList = storage.getShoppingList();
    const newShoppingList = generateShoppingList(todayMenu, ingredients);
    
    // 保留手动添加的项目，但排除已入库的食材
    const manualItems = currentShoppingList.filter(item => {
      if (!item.fromRecipe) {
        // 检查手动添加的项目是否已经入库
        const existingIngredient = ingredients.find(ing => ing.name === item.name);
        // 如果食材已存在且数量充足，则从采购清单中移除
        if (existingIngredient && existingIngredient.quantity >= item.quantity) {
          return false;
        }
        return true;
      }
      return false;
    });
    
    const updatedList = [...newShoppingList, ...manualItems];
    setShoppingList(updatedList);
    storage.saveShoppingList(updatedList);
  }, [todayMenu, ingredients]);

  // 切换标签页时，切换到菜单时清空选中状态
  useEffect(() => {
    if (activeTab === 'menu') {
      setSelectedItems(new Set());
    }
  }, [activeTab]);

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
    // 从 todayMenu 中查找菜谱（因为 todayMenu 中存储了完整的 recipe 对象）
    const menuItem = todayMenu.find(item => item.recipeId === recipeId);
    if (menuItem && menuItem.recipe) {
      console.log('开始消耗:', menuItem.recipe.name);
      setConsumptionRecipe(menuItem.recipe);
    } else {
      console.error('找不到菜谱:', recipeId);
      alert('找不到菜谱信息，请刷新页面重试');
    }
  };

  const handleConfirmConsumption = () => {
    if (!consumptionRecipe) return;

    // 消耗库存
    const updatedIngredients = consumeIngredients(consumptionRecipe, ingredients);
    setIngredients(updatedIngredients);
    storage.saveIngredients(updatedIngredients);

    // 从菜单中移除已消耗的菜谱
    const updatedMenu = todayMenu.filter(item => item.recipeId !== consumptionRecipe.id);
    setTodayMenu(updatedMenu);
    storage.saveTodayMenu(updatedMenu);

    // 关闭弹窗
    setConsumptionRecipe(null);
    
    // 触发 storage 更新事件，通知其他组件
    window.dispatchEvent(new Event('storage-update'));
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

  // 切换选中状态
  const handleToggleSelect = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedItems.size === shoppingList.length) {
      // 取消全选
      setSelectedItems(new Set());
    } else {
      // 全选
      setSelectedItems(new Set(shoppingList.map(item => item.id)));
    }
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
    // 使用选中的食材，而不是已购买的食材
    const selectedItemsList = shoppingList.filter(item => selectedItems.has(item.id));
    if (selectedItemsList.length === 0) {
      alert('请先选择要入库的食材');
      return;
    }

    const updatedIngredients = [...ingredients];
    
    selectedItemsList.forEach(item => {
      const existing = updatedIngredients.find(ing => ing.name === item.name);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        // 自动分类
        const category = getIngredientCategory(item.name);
        updatedIngredients.push({
          id: `ing_${Date.now()}_${Math.random()}`,
          name: item.name,
          category: category,
          quantity: item.quantity,
          unit: item.unit,
        });
      }
    });

    // 清理数量为0的非常备食材
    const cleanedIngredients = removeZeroQuantityIngredients(updatedIngredients);
    
    setIngredients(cleanedIngredients);
    storage.saveIngredients(cleanedIngredients);

    // 从采购清单中移除已入库的选中物品（立即删除，不等待useEffect）
    const remainingList = shoppingList.filter(item => !selectedItems.has(item.id));
    setShoppingList(remainingList);
    storage.saveShoppingList(remainingList);

    // 清空选中状态
    setSelectedItems(new Set());
    
    // 触发 storage 更新事件，通知其他组件
    window.dispatchEvent(new Event('storage-update'));
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
                disabled={selectedItems.size === 0}
              >
                一键入库 ({selectedItems.size})
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

          {shoppingList.length > 0 && (
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={selectedItems.size === shoppingList.length && shoppingList.length > 0}
                onChange={handleSelectAll}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label style={{ cursor: 'pointer', userSelect: 'none' }}>
                {selectedItems.size === shoppingList.length ? '取消全选' : '全选'}
              </label>
              {selectedItems.size > 0 && (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  已选择 {selectedItems.size} 项
                </span>
              )}
            </div>
          )}

          {showAddItem && (
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>添加物品</h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '2 1 200px' }}>
                  <input
                    type="text"
                    placeholder="物品名称"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="search-bar"
                    style={{ marginBottom: 0 }}
                  />
                </div>
                <div style={{ flex: '1 1 100px' }}>
                  <input
                    type="number"
                    placeholder="数量"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)}
                    className="search-bar"
                    style={{ marginBottom: 0 }}
                  />
                </div>
                <div style={{ flex: '1 1 80px' }}>
                  <input
                    type="text"
                    placeholder="单位"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="search-bar"
                    style={{ marginBottom: 0 }}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleAddManualItem}
                  style={{ height: '46px', whiteSpace: 'nowrap' }}
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
                    backgroundColor: selectedItems.has(item.id) ? 'var(--info-bg)' : 'var(--card-bg)',
                    border: selectedItems.has(item.id) ? '2px solid var(--primary-color)' : '1px solid transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleToggleSelect(item.id)}
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

