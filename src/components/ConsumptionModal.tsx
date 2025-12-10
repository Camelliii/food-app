import { Recipe } from '../types';
import { storage } from '../utils/storage';
import { generateConsumptionList } from '../utils/helpers';

interface ConsumptionModalProps {
  recipe: Recipe;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConsumptionModal({ recipe, onConfirm, onCancel }: ConsumptionModalProps) {
  const ingredients = storage.getIngredients();
  const consumptionList = generateConsumptionList(recipe, ingredients);

  const canConsume = consumptionList.every(item => 
    item.isStaple || item.currentStock > 0
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          backgroundColor: 'var(--card-bg)',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: 'var(--radius-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>
          确认消耗库存 - {recipe.name}
        </h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '1.125rem', fontWeight: 500 }}>消耗清单</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            请确认以下食材的消耗信息，确认后将自动从冰箱库存中扣减相应数量
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {consumptionList.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: item.isStaple ? 'var(--info-bg)' : 
                                  item.currentStock === 0 ? 'var(--danger-bg)' : 'var(--bg-color)',
                  border: item.currentStock === 0 ? '1px solid var(--danger-color)' : '1px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>{item.ingredientName}</span>
                  {item.isStaple && (
                    <span className="badge badge-info" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                      常备
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  <div style={{ marginBottom: '0.25rem' }}>
                    <strong>当前库存</strong>：{item.ingredientName}：{item.currentStock}{item.currentUnit}
                  </div>
                  <div style={{ marginBottom: '0.25rem' }}>
                    <strong>计划消耗量</strong>：需：{item.requiredQuantity}{item.requiredUnit}
                  </div>
                  {item.isStaple ? (
                    <div style={{ marginTop: '0.5rem', color: 'var(--primary-color)', fontWeight: 500 }}>
                      ✓ 常备物品，不参与自动库存管理
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>消耗后的预计算存</strong>：{item.currentStock}{item.currentUnit} → {item.afterConsumption}{item.currentUnit}
                      </div>
                      {item.currentStock === 0 && (
                        <div style={{ color: 'var(--danger-color)', marginTop: '0.5rem', fontWeight: 500 }}>
                          ⚠️ 库存为零，无法扣减
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onCancel}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={!canConsume}
            style={{ opacity: canConsume ? 1 : 0.5, cursor: canConsume ? 'pointer' : 'not-allowed' }}
          >
            确认消耗
          </button>
        </div>
      </div>
    </div>
  );
}

