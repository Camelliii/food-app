import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { importRecipesFromFile } from '../utils/recipeImporter';
import { storage } from '../utils/storage';

export default function RecipeImport() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [clearExisting, setClearExisting] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.json')) {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert('请选择JSON格式的文件');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const importResult = await importRecipesFromFile(file, clearExisting);
      setResult(importResult);
      
      // 如果导入成功，触发更新事件并导航
      if (importResult.success > 0) {
        window.dispatchEvent(new Event('storage-update'));
        setTimeout(() => {
          navigate('/recipes');
        }, 1500);
      }
    } catch (error) {
      setResult({
        success: 0,
        failed: 0,
        errors: [`导入失败: ${error}`],
      });
    } finally {
      setImporting(false);
    }
  };

  const [currentRecipeCount, setCurrentRecipeCount] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const recipes = await storage.getRecipes();
        setCurrentRecipeCount(recipes.length);
      } catch {
        setCurrentRecipeCount(storage.getRecipesSync().length);
      }
    };
    loadCount();
  }, [result]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '2rem' }}>导入菜谱</h1>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>当前菜谱数量</h3>
          <p style={{ fontSize: '1.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>
            {currentRecipeCount} 个
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Upload size={20} />
          选择JSON文件
        </h3>

        <div style={{ marginBottom: '1rem' }}>
          <label
            htmlFor="file-input"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '500',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ff5252';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-color)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Upload size={18} />
            <span>选择JSON文件</span>
          </label>
          <input
            id="file-input"
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            点击上方按钮选择 parsed_recipes.json 文件
          </p>
        </div>

        {file && (
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} />
              <strong>{file.name}</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </p>
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span>清空现有菜谱后再导入（推荐：如果这是第一次导入大量菜谱）</span>
          </label>
        </div>

        <button
          onClick={handleImport}
          disabled={!file || importing}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: file && !importing ? 'var(--primary-color)' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: file && !importing ? 'pointer' : 'not-allowed',
            fontSize: '1rem',
            fontWeight: 'bold',
            transition: 'all 0.2s',
            width: '100%',
          }}
          onMouseEnter={(e) => {
            if (file && !importing) {
              e.currentTarget.style.backgroundColor = '#ff5252';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (file && !importing) {
              e.currentTarget.style.backgroundColor = 'var(--primary-color)';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {importing ? '导入中...' : file ? '开始导入' : '请先选择文件'}
        </button>
      </div>

      {result && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>导入结果</h3>

          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'green' }}>
              <CheckCircle size={20} />
              <strong>成功: {result.success} 个</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'red' }}>
              <XCircle size={20} />
              <strong>失败: {result.failed} 个</strong>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} />
                错误信息
              </h4>
              <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                {result.errors.map((error, index) => (
                  <li key={index} style={{ marginBottom: '0.25rem' }}>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.success > 0 && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px' }}>
              <p style={{ margin: 0, color: 'green' }}>
                ✅ 导入成功！现在共有 <strong>{currentRecipeCount + result.success} 个菜谱</strong>
              </p>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: '2rem', backgroundColor: '#fff3cd' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>使用说明</h4>
        <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
          <li>首先运行解析脚本：<code>node scripts/parseExtractedRecipes.js</code></li>
          <li>解析完成后，会在项目根目录生成 <code>recipes_parsed.json</code> 文件</li>
          <li>在此页面选择该JSON文件并导入</li>
          <li>重复的菜谱（根据名称）会被自动跳过</li>
          <li>导入的菜谱包含：菜名、食材明细、制作信息（口味/工艺/耗时/难度）、做法步骤</li>
        </ol>
      </div>
    </div>
  );
}

