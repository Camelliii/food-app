import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { storage } from '../utils/storage';
import { Ingredient, IngredientCategory } from '../types';

export default function Inventory() {
  const [ingredients, setIngredients] = useState(storage.getIngredients());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Ingredient>>({
    name: '',
    category: '其他',
    quantity: 0,
    unit: '个',
    isStaple: false,
    needRestock: false,
  });

  const categories: IngredientCategory[] = ['蔬果', '肉禽蛋', '熟食', '调料', '其他'];

  const ingredientsByCategory = categories.reduce((acc, category) => {
    acc[category] = ingredients.filter(ing => ing.category === category);
    return acc;
  }, {} as Record<IngredientCategory, Ingredient[]>);

  const handleSave = () => {
    if (!formData.name?.trim()) {
      alert('请输入食材名称');
      return;
    }

    if (editingId) {
      // 编辑
      const updated = ingredients.map(ing =>
        ing.id === editingId
          ? { ...ing, ...formData } as Ingredient
          : ing
      );
      setIngredients(updated);
      storage.saveIngredients(updated);
      setEditingId(null);
    } else {
      // 新增
      const newIngredient: Ingredient = {
        id: `ing_${Date.now()}_${Math.random()}`,
        name: formData.name!,
        category: formData.category || '其他',
        quantity: formData.quantity || 0,
        unit: formData.unit || '个',
        isStaple: formData.isStaple || false,
        needRestock: formData.needRestock || false,
      };
      const updated = [...ingredients, newIngredient];
      setIngredients(updated);
      storage.saveIngredients(updated);
      setShowAddForm(false);
    }

    // 重置表单
    setFormData({
      name: '',
      category: '其他',
      quantity: 0,
      unit: '个',
      isStaple: false,
      needRestock: false,
    });
  };

  const handleEdit = (ingredient: Ingredient) => {
    setFormData(ingredient);
    setEditingId(ingredient.id);
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个食材吗？')) {
      const updated = ingredients.filter(ing => ing.id !== id);
      setIngredients(updated);
      storage.saveIngredients(updated);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      category: '其他',
      quantity: 0,
      unit: '个',
      isStaple: false,
      needRestock: false,
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>全家共享 · 实时库存</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            共 {ingredients.length} 种食材
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowAddForm(true);
            setEditingId(null);
            setFormData({
              name: '',
              category: '其他',
              quantity: 0,
              unit: '个',
              isStaple: false,
              needRestock: false,
            });
          }}
        >
          <Plus size={16} style={{ marginRight: '0.25rem' }} />
          添加食材
        </button>
      </div>

      {showAddForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>
            {editingId ? '编辑食材' : '添加食材'}
          </h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                食材名称 *
              </label>
              <input
                type="text"
                className="search-bar"
                placeholder="请输入食材名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  分类
                </label>
                <select
                  className="search-bar"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as IngredientCategory })}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  单位
                </label>
                <input
                  type="text"
                  className="search-bar"
                  placeholder="如：个、把、g"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                数量
              </label>
              <input
                type="number"
                className="search-bar"
                placeholder="请输入数量"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.1"
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.isStaple || false}
                  onChange={(e) => setFormData({ ...formData, isStaple: e.target.checked })}
                />
                <span>常备物品（不参与库存扣减）</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.needRestock || false}
                  onChange={(e) => setFormData({ ...formData, needRestock: e.target.checked })}
                />
                <span>需要补货</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={handleCancel}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {categories.map(category => {
        const categoryIngredients = ingredientsByCategory[category];
        if (categoryIngredients.length === 0) return null;

        return (
          <div key={category} className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {category}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {categoryIngredients.map(ingredient => (
                <div
                  key={ingredient.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-color)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 500, fontSize: '1.125rem' }}>
                        {ingredient.name}
                      </span>
                      {ingredient.isStaple && (
                        <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                          常备
                        </span>
                      )}
                      {ingredient.needRestock && (
                        <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                          ○ 补
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {ingredient.quantity}{ingredient.unit}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleEdit(ingredient)}
                      style={{ padding: '0.5rem' }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleDelete(ingredient.id)}
                      style={{ padding: '0.5rem', color: 'var(--danger-color)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {ingredients.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '1rem' }}>库存为空</p>
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            添加食材
          </button>
        </div>
      )}
    </div>
  );
}

