#!/usr/bin/env node
/**
 * 解析 recipes_extracted.txt 文件，转换为 JSON 格式
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseExtractedRecipes(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const recipes = [];
  
  // 按分隔符分割
  const sections = content.split(/={80,}/);
  
  for (const section of sections) {
    if (!section.trim() || section.includes('菜谱提取结果')) {
      continue;
    }
    
    const recipe = parseRecipe(section);
    if (recipe && recipe.name) {
      recipes.push(recipe);
    }
  }
  
  return recipes;
}

function parseRecipe(section) {
  const lines = section.split('\n').map(l => l.trim()).filter(l => l);
  
  if (lines.length === 0) return null;
  
  const recipe = {
    id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: '',
    category: ['其他'],
    description: '',
    cookTime: 30,
    servings: 2,
    ingredients: [],
    steps: [],
    taste: '',
    craft: '',
    time: '',
    difficulty: '',
    image: '', // 首图
  };
  
  let currentSection = '';
  let mainIngredients = [];
  let subIngredients = [];
  let isMainIngredient = true; // 标记当前是主料还是辅料
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 菜名
    if (line.startsWith('【菜名】')) {
      recipe.name = line.replace('【菜名】', '').trim();
      currentSection = 'name';
    }
    // 首图
    else if (line.startsWith('【首图】')) {
      recipe.image = line.replace('【首图】', '').trim();
    }
    // 食材明细
    else if (line.startsWith('【食材明细】')) {
      currentSection = 'ingredients';
      mainIngredients = [];
      subIngredients = [];
      isMainIngredient = true; // 默认从主料开始
    }
    // 制作信息
    else if (line.startsWith('【制作信息】')) {
      currentSection = 'metadata';
    }
    // 做法步骤
    else if (line.startsWith('【做法步骤】')) {
      currentSection = 'steps';
    }
    // 处理食材
    else if (currentSection === 'ingredients') {
      if (line === '主料：' || line === '主料') {
        isMainIngredient = true;
      } else if (line === '辅料：' || line === '辅料') {
        isMainIngredient = false;
      } else if (line.startsWith('- ')) {
        const ingredientLine = line.substring(2);
        const match = ingredientLine.match(/^(.+?):\s*(.+)$/);
        if (match) {
          const name = match[1].trim();
          const quantity = match[2].trim();
          
          // 解析数量和单位
          const qtyMatch = quantity.match(/^([\d.]+)\s*(.+)$/);
          let qty = 0;
          let unit = '';
          
          if (qtyMatch) {
            qty = parseFloat(qtyMatch[1]) || 0;
            unit = qtyMatch[2].trim() || '';
          } else if (quantity === '适量') {
            qty = 0;
            unit = '适量';
          } else {
            qty = 0;
            unit = quantity;
          }
          
          const ingredient = {
            ingredientId: `ing_${name}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            ingredientName: name,
            quantity: qty,
            unit: unit,
          };
          
          // 根据标记添加到主料或辅料
          if (isMainIngredient) {
            mainIngredients.push(ingredient);
          } else {
            subIngredients.push(ingredient);
          }
        }
      }
    }
    // 处理制作信息
    else if (currentSection === 'metadata') {
      if (line.startsWith('口味:')) {
        recipe.taste = line.replace('口味:', '').trim();
      } else if (line.startsWith('工艺:')) {
        recipe.craft = line.replace('工艺:', '').trim();
      } else if (line.startsWith('耗时:')) {
        recipe.time = line.replace('耗时:', '').trim();
        // 尝试从耗时中提取分钟数
        const timeMatch = recipe.time.match(/(\d+)\s*分钟/);
        if (timeMatch) {
          recipe.cookTime = parseInt(timeMatch[1]);
        } else if (recipe.time.includes('三刻钟')) {
          recipe.cookTime = 45;
        } else if (recipe.time.includes('一刻钟')) {
          recipe.cookTime = 15;
        } else if (recipe.time.includes('半小时')) {
          recipe.cookTime = 30;
        } else if (recipe.time.includes('小时')) {
          const hourMatch = recipe.time.match(/(\d+)\s*小时/);
          if (hourMatch) {
            recipe.cookTime = parseInt(hourMatch[1]) * 60;
          }
        }
      } else if (line.startsWith('难度:')) {
        recipe.difficulty = line.replace('难度:', '').trim();
      }
    }
    // 处理步骤
    else if (currentSection === 'steps') {
      if (line.startsWith('步骤 ')) {
        const stepMatch = line.match(/^步骤\s+(\d+):\s*(.+)$/);
        if (stepMatch) {
          const stepNum = parseInt(stepMatch[1]);
          const description = stepMatch[2].trim();
          
          // 检查下一行是否有图片
          let image = '';
          if (i + 1 < lines.length && lines[i + 1].startsWith('  图片:')) {
            image = lines[i + 1].replace('  图片:', '').trim();
            i++; // 跳过图片行
          }
          
          recipe.steps.push({
            step: stepNum,
            description: description,
            image: image || undefined,
          });
        }
      }
    }
  }
  
  // 合并主料和辅料
  recipe.ingredients = [...mainIngredients, ...subIngredients];
  
  // 如果没有描述，使用菜名
  if (!recipe.description) {
    recipe.description = `${recipe.name}的制作方法`;
  }
  
  // 如果没有步骤，至少生成一个默认步骤
  if (recipe.steps.length === 0) {
    recipe.steps.push({
      step: 1,
      description: '按照传统方法制作',
    });
  }
  
  // 根据工艺推断分类
  if (recipe.craft) {
    if (recipe.craft.includes('烘焙') || recipe.craft.includes('烤')) {
      recipe.category = ['烘焙'];
    } else if (recipe.craft.includes('煮') || recipe.craft.includes('炖') || recipe.craft.includes('煲')) {
      recipe.category = ['热菜'];
    } else if (recipe.craft.includes('凉拌') || recipe.craft.includes('拌')) {
      recipe.category = ['其他'];
    }
  }
  
  return recipe;
}

// 主函数
const inputFile = path.join(__dirname, '..', 'recipes_extracted.txt');
const outputFile = path.join(__dirname, '..', 'recipes_parsed.json');

console.log('开始解析 recipes_extracted.txt...');
const recipes = parseExtractedRecipes(inputFile);
console.log(`解析完成，共 ${recipes.length} 个菜谱`);

// 保存为JSON，确保使用UTF-8编码，并添加BOM以兼容某些浏览器
const jsonContent = JSON.stringify(recipes, null, 2);
// 使用UTF-8编码保存，不添加BOM（BOM可能导致某些解析器问题）
const buffer = Buffer.from(jsonContent, 'utf-8');
fs.writeFileSync(outputFile, buffer, { encoding: 'utf8' });
console.log(`已保存到 ${outputFile} (UTF-8编码)`);

