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
          backgroundColor: 'white',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>
          确认消耗库存 - {recipe.name}
        </h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '1.125rem' }}>消耗清单</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {consumptionList.map((item, index) => (
              <div
                key={index}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: item.isStaple ? '#e7f5ff' : 
                                  item.currentStock === 0 ? '#ffe3e3' : '#f3f4f6',
                  border: item.currentStock === 0 ? '1px solid var(--danger-color)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 500 }}>{item.ingredientName}</span>
                  {item.isStaple && (
                    <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                      常备
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <div>当前库存: {item.currentStock}{item.currentUnit}</div>
                  <div>需消耗: {item.requiredQuantity}{item.requiredUnit}</div>
                  {!item.isStaple && (
                    <div>
                      消耗后: {item.currentStock}{item.currentUnit} → {item.afterConsumption}{item.currentUnit}
                    </div>
                  )}
                  {item.currentStock === 0 && (
                    <div style={{ color: 'var(--danger-color)', marginTop: '0.25rem' }}>
                      ⚠️ 库存为零，无法扣减
                    </div>
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

