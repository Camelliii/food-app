import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let iconvLite = null;
try {
  iconvLite = require('iconv-lite');
} catch (e) {
  // iconv-lite不可用，将使用UTF-8
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 菜系映射表（将网页中的菜系映射到应用中的分类）
const categoryMap = {
  // 中华美食 - 各大菜系（热菜）
  '川菜': '热菜',
  '鲁菜': '热菜',
  '粤菜': '热菜',
  '湘菜': '热菜',
  '闽菜': '热菜',
  '浙菜': '热菜',
  '苏菜': '热菜',
  '徽菜': '热菜',
  '京菜': '热菜',
  '沪菜': '热菜',
  '豫菜': '热菜',
  '楚菜': '热菜',
  '东北菜': '热菜',
  '西北菜': '热菜',
  '云贵菜': '热菜',
  '江西菜': '热菜',
  '山西菜': '热菜',
  '港台菜': '热菜',
  '清真菜': '热菜',
  '其他菜系': '其他',
  
  // 西餐美食（热菜）
  '日本料理': '热菜',
  '韩国料理': '热菜',
  '美国菜': '热菜',
  '意大利菜': '热菜',
  '法国菜': '热菜',
  '墨西哥菜': '热菜',
  '东南亚菜': '热菜',
  '澳洲菜': '热菜',
  '其他菜谱': '其他',
  
  // 特色菜谱
  '家常菜': '热菜',
  '食谱': '其他',
  '凉菜': '其他',
  '糕点': '烘焙',
  '美味粥汤': '其他',
  '饮品': '饮品',
  '火锅底料的做法': '热菜',
  '微波菜谱': '热菜',
  '药膳偏方': '养生',
  '干果制作': '小吃',
  '私家菜': '热菜',
  '素斋菜': '其他',
  '点心': '小吃',
  '卤酱菜': '其他',
  '年夜饭': '热菜',
  
  // 各地小吃
  '安徽小吃': '小吃',
  '北京小吃': '小吃',
  '重庆小吃': '小吃',
  '福建小吃': '小吃',
  '甘肃小吃': '小吃',
  '广东小吃': '小吃',
  '广西小吃': '小吃',
  '贵州小吃': '小吃',
  '海南小吃': '小吃',
  '河北小吃': '小吃',
  '河南小吃': '小吃',
  '湖北小吃': '小吃',
  '湖南小吃': '小吃',
  '吉林小吃': '小吃',
  '江苏小吃': '小吃',
  '江西小吃': '小吃',
  '辽宁小吃': '小吃',
  '宁夏小吃': '小吃',
  '青海小吃': '小吃',
  '山西小吃': '小吃',
  '陕西小吃': '小吃',
  '山东小吃': '小吃',
  '上海小吃': '小吃',
  '四川小吃': '小吃',
  '天津小吃': '小吃',
  '黑龙江小吃': '小吃',
  '西藏小吃': '小吃',
  '新疆小吃': '小吃',
  '云南小吃': '小吃',
  '内蒙古小吃': '小吃',
  '浙江小吃': '小吃',
};

/**
 * 根据关键词智能判断分类
 */
function inferCategoryFromText(text) {
  if (!text) return '其他';
  
  const lowerText = text.toLowerCase();
  
  // 小吃相关关键词
  if (lowerText.includes('小吃') || 
      lowerText.includes('点心') || 
      lowerText.includes('零食') ||
      lowerText.includes('干果')) {
    return '小吃';
  }
  
  // 饮品相关关键词
  if (lowerText.includes('饮品') || 
      lowerText.includes('饮料') || 
      lowerText.includes('茶') ||
      lowerText.includes('汤') && !lowerText.includes('菜')) {
    return '饮品';
  }
  
  // 烘焙相关关键词
  if (lowerText.includes('糕点') || 
      lowerText.includes('蛋糕') || 
      lowerText.includes('面包') ||
      lowerText.includes('烘焙') ||
      lowerText.includes('饼干') ||
      lowerText.includes('甜点')) {
    return '烘焙';
  }
  
  // 养生相关关键词
  if (lowerText.includes('养生') || 
      lowerText.includes('药膳') || 
      lowerText.includes('滋补') ||
      lowerText.includes('健康')) {
    return '养生';
  }
  
  // 凉菜相关
  if (lowerText.includes('凉菜') || 
      lowerText.includes('冷菜') || 
      lowerText.includes('拌')) {
    return '其他';
  }
  
  // 默认热菜
  return '热菜';
}

/**
 * 检测文本是否包含乱码
 */
function hasGarbledText(text) {
  if (!text || text.length < 50) return false;
  
  // 检查中文字符数量
  const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const totalCharCount = text.length;
  
  // 如果中文字符比例很低（<2%），可能是乱码
  if (chineseCharCount / totalCharCount < 0.02) {
    return true;
  }
  
  // 检查是否包含常见的乱码字符模式（如连续的乱码字符）
  const garbledPatterns = [
    /[锟斤拷]/g,  // 常见的GBK转UTF-8乱码
    /[�]/g,       // 替换字符
    /[€€€]/g,     // 欧元符号乱码
  ];
  
  for (const pattern of garbledPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 读取HTML文件，自动检测编码
 */
function readHTMLFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  
  // 策略：优先尝试GBK/GB2312（因为美食天下网站可能使用GBK编码）
  // 如果iconv-lite可用，先尝试GBK
  if (iconvLite) {
    // 先尝试GBK
    try {
      let content = iconvLite.decode(buffer, 'gbk');
      // 检查是否包含关键的中文关键词（如果能找到这些词，说明编码正确）
      if (content.includes('主料') || content.includes('辅料') || content.includes('做法步骤') || 
          content.includes('recipe_De_title') || content.includes('recipeStep')) {
        if (!hasGarbledText(content)) {
          return content;
        }
      }
    } catch (e) {
      // GBK解码失败
    }
    
    // 再尝试GB2312
    try {
      let content = iconvLite.decode(buffer, 'gb2312');
      if (content.includes('主料') || content.includes('辅料') || content.includes('做法步骤') ||
          content.includes('recipe_De_title') || content.includes('recipeStep')) {
        if (!hasGarbledText(content)) {
          return content;
        }
      }
    } catch (e) {
      // GB2312解码失败
    }
  }
  
  // 回退到UTF-8
  let content = buffer.toString('utf-8');
  
  // 检查UTF-8是否包含关键关键词
  if (content.includes('主料') || content.includes('辅料') || content.includes('做法步骤') ||
      content.includes('recipe_De_title') || content.includes('recipeStep')) {
    if (!hasGarbledText(content)) {
      return content;
    }
  }
  
  // 如果UTF-8也检测到乱码，且iconv-lite可用，强制使用GBK
  if (iconvLite && hasGarbledText(content)) {
    try {
      content = iconvLite.decode(buffer, 'gbk');
      return content; // 即使可能还有乱码，也返回GBK解码的结果
    } catch (e) {
      // 解码失败
    }
  }
  
  return content;
}

/**
 * 解析美食天下网站的HTML文件
 */
function parseMeishichinaHTML(htmlContent) {
  try {
    // 提取标题 - 从 h1.recipe_De_title 或 title 标签
    let name = '未知菜谱';
    const h1Match = htmlContent.match(/<h1[^>]*class="recipe_De_title"[^>]*><a[^>]*>([^<]+)<\/a><\/h1>/);
    if (h1Match) {
      name = cleanHTMLText(h1Match[1]).trim();
    } else {
      const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        name = titleMatch[1]
          .replace(/的做法.*$/, '')
          .replace(/怎么做.*$/, '')
          .replace(/_.*$/, '')
          .trim();
      }
    }

    // 提取描述 - 从 blockquote.block_txt
    let description = '';
    const blockquoteMatch = htmlContent.match(/<blockquote[^>]*class="block_txt"[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/);
    if (blockquoteMatch) {
      description = cleanHTMLText(blockquoteMatch[1])
        .replace(/^[""]/, '')
        .replace(/[""]\s*$/, '')
        .trim();
    }
    
    // 如果没有描述，使用 meta description
    if (!description) {
      const metaDescMatch = htmlContent.match(/<meta\s+name="description"\s+content="([^"]+)"/);
      if (metaDescMatch) {
        description = metaDescMatch[1]
          .replace(/&ldquo;/g, '"')
          .replace(/&rdquo;/g, '"')
          .replace(/&hellip;/g, '...')
          .trim();
      }
    }
    
    if (!description) {
      description = `${name}的制作方法`;
    }

    // 提取主图 - 从 recipe_De_imgBox
    let mainImage = '';
    const imgBoxMatch = htmlContent.match(/<div[^>]*class="recipe_De_imgBox"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/);
    if (imgBoxMatch) {
      mainImage = imgBoxMatch[1];
    }

    // 提取分类 - 从导航栏或路径
    let category = ['热菜']; // 默认热菜
    const categoryKeywords = {
      '热菜': ['热菜', 'recai'],
      '凉菜': ['凉菜', 'liangcai'],
      '汤羹': ['汤羹', 'tanggeng'],
      '主食': ['主食', 'zhushi'],
      '小吃': ['小吃', 'xiaochi'],
      '西餐': ['西餐', 'xican'],
      '烘焙': ['烘焙', 'hongbei'],
      '饮品': ['饮品', 'yinpin'],
    };
    
    // 从路径中提取分类
    const pathMatch = htmlContent.match(/<a[^>]*title="([^"]+)"[^>]*href="[^"]*\/recipe\/([^\/]+)\//);
    if (pathMatch) {
      const categoryTitle = pathMatch[1];
      const categorySlug = pathMatch[2];
      
      for (const [cat, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(k => categoryTitle.includes(k) || categorySlug.includes(k))) {
          category = [cat];
          break;
        }
      }
    }
    
    // 如果没找到，从导航栏提取
    if (category[0] === '热菜') {
      const navMatch = htmlContent.match(/<li><a[^>]*class="on"[^>]*title="([^"]+)"[^>]*href="[^"]*\/recipe\/([^\/]+)\//);
      if (navMatch) {
        const categoryTitle = navMatch[1];
        const categorySlug = navMatch[2];
        
        for (const [cat, keywords] of Object.entries(categoryKeywords)) {
          if (keywords.some(k => categoryTitle.includes(k) || categorySlug.includes(k))) {
            category = [cat];
            break;
          }
        }
      }
    }

    // 提取食材 - 从 fieldset.particulars，不依赖中文字符匹配，直接通过HTML结构提取
    let materialsText = '';
    
    // 查找所有 fieldset.particulars 结构（不管legend里是什么文字）
    const particularsMatches = htmlContent.matchAll(/<fieldset[^>]*class="particulars"[^>]*>([\s\S]*?)<\/fieldset>/g);
    
    for (const fieldsetMatch of particularsMatches) {
      const fieldsetContent = fieldsetMatch[1];
      
      // 查找ul标签
      const ulMatch = fieldsetContent.match(/<ul>([\s\S]*?)<\/ul>/);
      if (ulMatch) {
        const ulContent = ulMatch[1];
        const liMatches = ulContent.matchAll(/<li>([\s\S]*?)<\/li>/g);
        
        for (const liMatch of liMatches) {
          const liContent = liMatch[1];
          
          // 提取食材名 - 从 <b> 标签（可能在 <a> 标签内）
          let ingredientName = '';
          // 先尝试 <a><b> 结构
          const aBMatch = liContent.match(/<a[^>]*><b>([^<]+)<\/b><\/a>/);
          if (aBMatch) {
            ingredientName = cleanHTMLText(aBMatch[1]).trim();
          } else {
            // 再尝试单独的 <b> 标签
            const bMatch = liContent.match(/<b>([^<]+)<\/b>/);
            if (bMatch) {
              ingredientName = cleanHTMLText(bMatch[1]).trim();
            }
          }
          
          // 提取数量 - 从 category_s2 类
          let quantity = '适量';
          const quantityMatch = liContent.match(/<span[^>]*class="category_s2"[^>]*>([^<]+)<\/span>/);
          if (quantityMatch) {
            quantity = cleanHTMLText(quantityMatch[1]).trim();
          }
          
          if (ingredientName && ingredientName.length > 0) {
            if (materialsText) materialsText += '，';
            materialsText += `${ingredientName} ${quantity}`;
          }
        }
      }
    }
    
    // 调试：检查是否提取到食材
    const hasParticulars = htmlContent.includes('class="particulars"');
    if (materialsText === '' && hasParticulars) {
      // 尝试输出第一个fieldset的内容用于调试
      const firstFieldset = htmlContent.match(/<fieldset[^>]*class="particulars"[^>]*>([\s\S]{0,500})/);
      if (firstFieldset) {
        console.warn(`⚠ 调试: 找到particulars但未提取到食材，前500字符: ${firstFieldset[1].substring(0, 200)}`);
      }
    }

    // 解析食材
    const ingredients = parseIngredients(materialsText);

    // 提取步骤 - 直接通过HTML结构提取，不依赖中文字符
    const steps = [];
    
    // 直接查找 recipeStep div（不依赖"做法步骤"文本）
    const stepsMatch = htmlContent.match(/<div[^>]*class="recipeStep"[^>]*>([\s\S]*?)<\/div>/);
    if (stepsMatch) {
      const recipeStepContent = stepsMatch[1];
      const ulMatch = recipeStepContent.match(/<ul>([\s\S]*?)<\/ul>/);
      if (ulMatch) {
        const ulContent = ulMatch[1];
        
        // 改进：使用更可靠的方法提取所有 <li> 标签
        // 先找到所有 <li> 的开始位置
        const liStartPositions = [];
        let searchPos = 0;
        while (true) {
          const pos = ulContent.indexOf('<li>', searchPos);
          if (pos === -1) break;
          liStartPositions.push(pos);
          searchPos = pos + 4;
        }
        
        // 对每个 <li>，找到匹配的 </li>
        for (let i = 0; i < liStartPositions.length; i++) {
          const startPos = liStartPositions[i];
          const nextLiPos = i < liStartPositions.length - 1 
            ? liStartPositions[i + 1] 
            : ulContent.length;
          
          // 在当前 <li> 和下一个 <li> 之间查找 </li>
          const liSection = ulContent.substring(startPos, nextLiPos);
          const liEndMatch = liSection.match(/<\/li>/);
          if (!liEndMatch) continue;
          
          const liContent = liSection.substring(4, liEndMatch.index);
          
          // 提取步骤图片 - 从 recipeStep_img
          let stepImage = '';
          // 尝试多种图片匹配方式
          const imgDivMatch = liContent.match(/<div[^>]*class="recipeStep_img"[^>]*>[\s\S]*?<img[^>]*(?:data-src|src)="([^"]+)"/);
          if (imgDivMatch) {
            stepImage = imgDivMatch[1];
          } else {
            // 如果没有找到，尝试直接匹配img标签
            const imgMatch = liContent.match(/<img[^>]*(?:data-src|src)="([^"]+)"/);
            if (imgMatch) {
              stepImage = imgMatch[1];
            }
          }
          
          // 提取步骤文字 - 从 recipeStep_word
          let stepText = '';
          let wordDivStart = -1;
          let startTagEnd = -1;
          let endPos = -1;
          
          // 查找 recipeStep_word div 的开始位置
          wordDivStart = liContent.indexOf('class="recipeStep_word"');
          if (wordDivStart !== -1) {
            // 找到开始标签的结束位置（可能是 > 或 />）
            startTagEnd = liContent.indexOf('>', wordDivStart);
            if (startTagEnd === -1) {
              startTagEnd = liContent.indexOf('/>', wordDivStart);
              if (startTagEnd !== -1) startTagEnd += 1;
            }
            
            if (startTagEnd !== -1) {
              // 从开始标签后提取内容，需要找到匹配的 </div>
              let remaining = liContent.substring(startTagEnd + 1);
              let depth = 1;
              endPos = -1;
              
              // 查找匹配的 </div>，处理嵌套div（如 <div class="grey">）
              for (let j = 0; j < remaining.length - 5; j++) {
                const substr4 = remaining.substring(j, j + 4);
                const substr6 = remaining.substring(j, j + 6);
                
                // 检查是否是 <div 开始标签
                if (substr4 === '<div' && (remaining[j+4] === ' ' || remaining[j+4] === '>' || remaining[j+4] === '\n' || remaining[j+4] === '\t')) {
                  depth++;
                } 
                // 检查是否是 </div> 结束标签
                else if (substr6 === '</div>') {
                  depth--;
                  if (depth === 0) {
                    endPos = j;
                    break;
                  }
                }
              }
              
              if (endPos > 0) {
                let content = remaining.substring(0, endPos);
                // 先移除步骤编号的 <div class="grey"> 标签
                content = content.replace(/<div[^>]*class="grey"[^>]*>[\s\S]*?<\/div>/g, '');
                // 然后清理其他HTML标签，只保留文本
                stepText = cleanHTMLText(content);
              }
            }
          }
          
          // 方法2: 如果方法1失败，从li中直接提取文本（排除图片部分）
          if (!stepText || stepText.length < 3) {
            // 移除图片部分
            let textContent = liContent.replace(/<div[^>]*class="recipeStep_img"[^>]*>[\s\S]*?<\/div>/g, '');
            // 移除步骤编号div
            textContent = textContent.replace(/<div[^>]*class="grey"[^>]*>[\s\S]*?<\/div>/g, '');
            stepText = cleanHTMLText(textContent);
          }
          
          // 清理步骤文本
          if (stepText) {
            // 移除步骤编号（可能在开头）
            stepText = stepText.replace(/^\d+[\.。、]?\s*/, '').trim();
            // 移除可能的HTML实体和多余空白
            stepText = stepText.replace(/\s+/g, ' ').trim();
            
            // 如果文本长度足够，添加到步骤列表
            if (stepText.length > 2) {
              steps.push({
                step: steps.length + 1,
                description: stepText,
                image: stepImage || undefined,
              });
            } else if (steps.length === 0 && i === 0) {
              // 只在第一个步骤失败时输出调试信息
              console.warn(`⚠ 调试: 提取到文本但长度不足 - 长度: ${stepText.length}, 内容: "${stepText}"`);
              console.warn(`   原始liContent中recipeStep_word位置: ${wordDivStart}`);
            }
          } else if (steps.length === 0 && i === 0) {
            // 只在第一个步骤失败时输出调试信息
            console.warn(`⚠ 调试: 未能提取步骤文本`);
            console.warn(`   wordDivStart: ${wordDivStart}, startTagEnd: ${startTagEnd !== -1 ? startTagEnd : '未找到'}, endPos: ${endPos}`);
          }
        }
      }
    }
    
    // 调试：如果没找到步骤，输出调试信息
    const hasRecipeStep = htmlContent.includes('class="recipeStep"');
    if (steps.length === 0 && hasRecipeStep) {
      // 尝试输出第一个li的完整内容用于调试
      const debugMatch = htmlContent.match(/<div[^>]*class="recipeStep"[^>]*>[\s\S]*?<ul>[\s\S]*?<li>([\s\S]{0,2000})<\/li>/);
      if (debugMatch) {
        const liContent = debugMatch[1];
        const hasWordDiv = liContent.includes('recipeStep_word');
        const hasImgDiv = liContent.includes('recipeStep_img');
        
        // 尝试提取 recipeStep_word 的内容
        let wordContent = '';
        const wordDivIndex = liContent.indexOf('class="recipeStep_word"');
        if (wordDivIndex !== -1) {
          const startTagEnd = liContent.indexOf('>', wordDivIndex);
          if (startTagEnd !== -1) {
            wordContent = liContent.substring(startTagEnd + 1, startTagEnd + 200);
          }
        }
        
        console.warn(`⚠ 调试: 找到recipeStep但未提取到步骤 - hasWordDiv: ${hasWordDiv}, hasImgDiv: ${hasImgDiv}`);
        console.warn(`   recipeStep_word内容预览: ${wordContent.substring(0, 150)}`);
        console.warn(`   完整li内容长度: ${liContent.length}字符`);
      }
    }

    // 如果没有步骤，至少生成一个默认步骤
    if (steps.length === 0) {
      steps.push({
        step: 1,
        description: '按照传统方法制作',
        image: mainImage || undefined,
      });
    }

    // 生成ID
    const id = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 估算制作时间（根据步骤数量）
    const cookTime = Math.max(10, steps.length * 5);
    
    // 估算适合人数（默认2-4人）
    const servings = 2 + Math.floor(Math.random() * 3);

    return {
      id,
      name,
      category,
      image: mainImage || undefined,
      description,
      cookTime,
      servings,
      ingredients,
      steps,
    };
  } catch (error) {
    console.error('解析美食天下菜谱时出错:', error);
    return null;
  }
}

/**
 * 解析HTML文件，提取菜谱信息（适配美食天下网站）
 */
function parseRecipeHTML(htmlContent) {
  try {
    // 检查是否是美食天下的页面（有 recipe_De_title 类）
    const isMeishichina = htmlContent.includes('recipe_De_title') || htmlContent.includes('meishichina.com');
    
    if (isMeishichina) {
      return parseMeishichinaHTML(htmlContent);
    }
    
    // 原有的解析逻辑（兼容其他格式）
    // 提取article标签内容
    const articleMatch = htmlContent.match(/<article>([\s\S]*?)<\/article>/);
    if (!articleMatch) {
      return null; // 如果没有article标签，返回null
    }
    const articleContent = articleMatch[1];

    // 提取标题 - 多种方法尝试
    let name = '未知菜谱';
    
    // 方法1: 从h1标签提取
    const h1Match = htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/);
    if (h1Match) {
      name = h1Match[1]
        .replace(/家常做法.*$/, '')
        .replace(/怎么做.*$/, '')
        .trim();
    }
    
    // 方法2: 从title标签提取
    if (name === '未知菜谱') {
      const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        name = titleMatch[1]
          .replace(/-.*$/, '')
          .replace(/怎么做.*$/, '')
          .replace(/家常做法.*$/, '')
          .trim();
      }
    }

    // 提取描述（从"特色"或"功效"部分）- 需要在分类提取之前，因为分类推断会用到描述
    let description = '';
    
    // 先尝试提取"特色"
    const featureMatch = articleContent.match(/特色[：:]\s*([^<\n]+)/);
    if (featureMatch) {
      description = cleanHTMLText(featureMatch[1]);
    }
    
    // 如果没有特色，尝试提取"功效"
    if (!description) {
      const effectMatch = articleContent.match(/功效[：:]\s*([^<\n]+)/);
      if (effectMatch) {
        description = cleanHTMLText(effectMatch[1]);
      }
    }
    
    // 如果还没有，尝试从"菜系相关功效"提取
    if (!description) {
      const effectMatch2 = articleContent.match(/菜系相关功效[：:]\s*([^<\n]+)/);
      if (effectMatch2) {
        description = cleanHTMLText(effectMatch2[1]);
      }
    }
    
    // 如果还是没有，使用meta description
    if (!description) {
      const metaDescMatch = htmlContent.match(/<meta\s+name="description"\s+content="([^"]+)"/);
      if (metaDescMatch) {
        description = metaDescMatch[1]
          .replace(/&ldquo;/g, '"')
          .replace(/&rdquo;/g, '"')
          .replace(/&hellip;/g, '...')
          .trim();
      }
    }
    
    // 如果还是没有，使用默认描述
    if (!description) {
      description = `${name}的制作方法`;
    }

    // 提取菜系（从article中）
    let category = ['其他'];
    
    // 方法1: 从"菜系"字段提取
    const categoryMatch = articleContent.match(/菜系[：:]\s*([^<\n]+)/);
    if (categoryMatch) {
      const categoryText = categoryMatch[1].trim();
      const mappedCategory = categoryMap[categoryText] || inferCategoryFromText(categoryText);
      category = [mappedCategory];
    } else {
      // 方法2: 从"所属地区"提取
      const regionMatch = articleContent.match(/所属地区[：:]\s*([^<\n]+)/);
      if (regionMatch) {
        const regionText = regionMatch[1].trim();
        const mappedCategory = categoryMap[regionText] || inferCategoryFromText(regionText);
        category = [mappedCategory];
      } else {
        // 方法3: 从标题和描述中智能推断
        const inferredCategory = inferCategoryFromText(name + ' ' + description);
        category = [inferredCategory];
      }
    }
    
    // 如果分类是"其他"，尝试从描述中再次推断
    if (category[0] === '其他') {
      const refinedCategory = inferCategoryFromText(description);
      if (refinedCategory !== '其他') {
        category = [refinedCategory];
      }
    }

    // 提取制作材料（主料和调料）
    let materialsText = '';
    
    // 策略0：全文搜索常见的材料相关关键词（最高优先级）
    // 有些网页会把主料和辅料分开写，或者写成"原料"
    const commonLabels = ['主料', '辅料', '调料', '配料', '原料', '材料', '食材'];
    const labelRegex = new RegExp(`(${commonLabels.join('|')})[：:]\\s*([^<\\n]+)`, 'g');
    
    // 先扫描全文提取所有明确标记的材料
    // 我们使用 Set 来去重，防止同一种材料被多次提取
    const foundMaterials = new Set();
    const allMatches = articleContent.matchAll(labelRegex);
    for (const match of allMatches) {
       const content = cleanHTMLText(match[2]);
       if (content.length > 1 && !content.includes('注意事项')) {
          foundMaterials.add(content);
       }
    }
    
    if (foundMaterials.size > 0) {
       materialsText = Array.from(foundMaterials).join('，');
    }

    // 策略1：查找常规的材料列表（如果策略0提取的不够多，可能是有列表结构）
    if (materialsText.length < 10) {
      const materialsListMatch = articleContent.match(/(?:所需材料|制作材料|食材清单|材料|原料)[：:]?[\s\S]*?<ul>([\s\S]*?)<\/ul>/i);
      if (materialsListMatch) {
         const ulContent = materialsListMatch[1];
         const liMatches = ulContent.matchAll(/<li>([\s\S]*?)<\/li>/g);
         for (const liMatch of liMatches) {
           let text = cleanHTMLText(liMatch[1]);
           
           // 移除"主料："、"辅料："、"调料："等前缀
           text = text.replace(/^(主料|辅料|调料|配料|原料)[：:]\s*/, '');
           
           // 忽略非食材文本
           if (text.length > 1 && !text.includes('注意事项')) {
              if (materialsText) materialsText += '，';
              materialsText += text;
           }
         }
      }
    }

    // 策略2：如果策略1没找到，检查是否在步骤中包含了"准备原料"的嵌套列表（针对特殊的HTML结构）
    if (!materialsText) {
      const nestedMaterialMatch = articleContent.match(/准备原料[\s\S]*?<ul>([\s\S]*?)<\/ul>/i);
      if (nestedMaterialMatch) {
        const ulContent = nestedMaterialMatch[1];
        const liMatches = ulContent.matchAll(/<li>([\s\S]*?)<\/li>/g);
        for (const liMatch of liMatches) {
          let text = cleanHTMLText(liMatch[1]);
          // 确保包含主料或辅料等关键词，或者是典型的食材格式
          if (text.includes('主料') || text.includes('辅料') || text.includes('调料') || /^\d/.test(text)) {
             text = text.replace(/^(主料|辅料|调料|配料)[：:]\s*/, '');
             if (materialsText) materialsText += '，';
             materialsText += text;
          }
        }
      }
    }

    // 策略3：如果仍然没找到，尝试在所有段落中查找包含"主料"、"辅料"、"原料"的行
    if (!materialsText) {
      // 提取所有段落
      const pMatches = articleContent.matchAll(/<p>([\s\S]*?)<\/p>/g);
      for (const pMatch of pMatches) {
         let text = cleanHTMLText(pMatch[1]);
         
         // 优先匹配明确的配方/原料标记
         if (text.match(/^(原料配方|制作材料|原料|配方|配料)[：:]/)) {
             // 移除前缀后，如果内容长度足够，直接采用
             const content = text.replace(/^(原料配方|制作材料|原料|配方|配料)[：:]\s*/, '');
             if (content.length > 5) {
                 if (materialsText) materialsText += '，';
                 materialsText += content;
                 continue; // 找到了明确的原料段落，继续找下一段
             }
         }
         
         // 其次匹配包含关键字的行
         if (text.includes('主料') || text.includes('辅料') || text.includes('原料')) {
            // 排除"花糕的介绍"、"特色"等描述性段落
            if (text.includes('介绍') || text.includes('特色') || text.includes('工艺')) continue;
            
            // 移除可能的前缀
            text = text.replace(/^(所需材料|制作材料|材料|原料|食材)[：:]\s*/, '');
            if (materialsText) materialsText += '，';
            materialsText += text;
         }
      }
    }

    // 如果列表提取的内容太少（可能提取错了），尝试传统的单独提取
    if (materialsText.length < 5) {
        // 提取主料
        const mainMatch = articleContent.match(/主料[：:]\s*([^<\n]+)/);
        if (mainMatch) {
          if (materialsText) materialsText += '，';
          materialsText += mainMatch[1].trim();
        }
        
        // 提取辅料
        const subMatch = articleContent.match(/辅料[：:]\s*([^<\n]+)/);
        if (subMatch) {
          if (materialsText) materialsText += '，';
          materialsText += subMatch[1].trim();
        }
        
        // 提取调料
        const seasoningMatch = articleContent.match(/调料[：:]\s*([^<\n]+)/);
        if (seasoningMatch) {
          if (materialsText) materialsText += '，';
          materialsText += seasoningMatch[1].trim();
        }
    }
    
    // 如果没有找到主料/调料，尝试从"制作材料"整体提取（针对非列表结构）
    if (!materialsText) {
      const materialsMatch = articleContent.match(/制作材料[：:]\s*([\s\S]*?)(?=<p>|<\/article>)/);
      if (materialsMatch) {
        materialsText = cleanHTMLText(materialsMatch[1]);
      }
    }

    // 解析食材
    const ingredients = parseIngredients(materialsText);

    // 提取烹饪步骤
    const steps = parseSteps(articleContent);

    // 生成ID
    const id = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 估算制作时间（根据步骤数量）
    const cookTime = Math.max(10, steps.length * 5);
    
    // 估算适合人数（默认2-4人）
    const servings = 2 + Math.floor(Math.random() * 3);

    return {
      id,
      name,
      category,
      description: description || `${name}的制作方法`,
      cookTime,
      servings,
      ingredients,
      steps,
    };
  } catch (error) {
    console.error('解析菜谱时出错:', error);
    return null;
  }
}

/**
 * 解析食材列表
 */
function parseIngredients(materialsText) {
  const ingredients = [];
  
  if (!materialsText) return ingredients;

  // 清理文本
  let cleanText = cleanHTMLText(materialsText);
  
  // 1. 将中间出现的类别标签替换为逗号，以便分割
  // 例如 "主料：A，B 辅料：C" -> "A，B，C"
  cleanText = cleanText.replace(/\s*(?:所需材料|制作材料|食材清单|主料|辅料|调料|配料|原料|材料|食材)[：:]\s*/g, '，');

  // 2. 尝试在 "数字+单位" 后面加逗号（处理空格分隔的情况）
  // 例如 "粳米 100克 桂皮 2克" -> "粳米 100克，桂皮 2克"
  const units = '克|g|千克|kg|斤|两|个|只|根|片|瓣|把|勺|毫升|ml|升|l|碗|杯|条|块|张|包|袋|瓶|盒|大匙|茶匙';
  const spaceSplitRegex = new RegExp(`(\\d+(?:\\.\\d+)?\\s*(?:${units}))\\s+(?=[^0-9，,、;；。])`, 'g');
  cleanText = cleanText.replace(spaceSplitRegex, '$1，');

  // 移除开头多余的标点
  cleanText = cleanText.replace(/^[，,、;；。]+/, '');

  // 按常见分隔符分割（支持中文和英文标点）
  const parts = cleanText.split(/[，,、;；。]/).filter(p => p.trim());
  
  for (const part of parts) {
    let trimmed = part.trim();
    
    // 移除可能的前缀（双重保险）
    trimmed = trimmed.replace(/^(主料|辅料|调料|配料|原料)[：:]\s*/, '');
    
    if (!trimmed || trimmed.length < 1) continue; // 放宽长度限制，可能有"盐"这种单字

    // 移除可能的括号内容（如"猪肉（肥瘦）" -> "猪肉"）
    const nameMatch = trimmed.match(/^([^（(]+)/);
    if (nameMatch) {
      trimmed = nameMatch[1].trim();
    }

    // 尝试匹配：食材名 + 数量 + 单位
    // 匹配模式1: 食材名 + 数字 + 单位（如：小麦面粉1300克）
    let match = trimmed.match(/^([^0-9]+?)(\d+(?:\.\d+)?)\s*([^\d\s]+?)$/);
    
    if (!match) {
      // 匹配模式2: 食材名 + 数字（单位可能在前面的文本中）
      match = trimmed.match(/^([^0-9]+?)(\d+(?:\.\d+)?)$/);
      if (match) {
        // 尝试从上下文推断单位
        const unitMatch = trimmed.match(new RegExp(`(${units}|适量|少许)$`));
        match[3] = unitMatch ? unitMatch[1] : '适量';
      }
    }
    
    if (match) {
      const ingredientName = match[1].trim();
      const quantity = parseFloat(match[2]) || 1;
      const unit = (match[3] || '适量').trim();
      
      // 生成食材ID
      const ingredientId = `ing_${ingredientName.replace(/\s/g, '_').replace(/[（）()]/g, '')}_${Math.random().toString(36).substr(2, 6)}`;
      
      ingredients.push({
        ingredientId,
        ingredientName,
        quantity,
        unit,
      });
    } else {
      // 如果无法解析，但看起来像个食材（不含特殊字符），也保存
      // 排除纯数字或符号
      if (/^[\d\s\.\-]+$/.test(trimmed)) continue;

      const ingredientId = `ing_${trimmed.replace(/\s/g, '_').replace(/[（）()]/g, '')}_${Math.random().toString(36).substr(2, 6)}`;
      ingredients.push({
        ingredientId,
        ingredientName: trimmed,
        quantity: 1,
        unit: '适量',
      });
    }
  }

  return ingredients;
}

/**
 * 解析烹饪步骤
 */
function parseSteps(articleContent) {
  const steps = [];
  
  if (!articleContent) return steps;

  // 预处理：查找步骤区域
  // 我们不仅匹配第一个ul，而是尝试找到步骤标题后的所有内容
  let stepsRegion = '';
  const stepsHeaderMatch = articleContent.match(/(详细做法步骤|详细制作步骤|制作步骤|做法步骤|教您.*怎么做)[：:]?([\s\S]*)/);
  
  if (stepsHeaderMatch) {
    stepsRegion = stepsHeaderMatch[2];
    
    // 截断到下一个大标题（如果存在），防止把后面的"小贴士"等也算进去
    // 查找下一个 <h3>, <h4>, <h5>, <hr> 或特定的结束词
    const nextHeaderMatch = stepsRegion.match(/<(h[3-6]|hr)[^>]*>|温馨提示|制作要诀|健康提示|小贴士|注意事项/);
    if (nextHeaderMatch) {
      stepsRegion = stepsRegion.substring(0, nextHeaderMatch.index);
    }
  }

  // 方法1: 在确定的步骤区域内提取所有列表项 (li)
  if (stepsRegion) {
    const liMatches = stepsRegion.matchAll(/<li>([\s\S]*?)<\/li>/g);
    for (const liMatch of liMatches) {
       addStep(steps, liMatch[1]);
    }
    
    // 如果在区域内没找到 li，尝试找 p
    if (steps.length === 0) {
       const pMatches = stepsRegion.matchAll(/<p>([\s\S]*?)<\/p>/g);
       for (const pMatch of pMatches) {
          addStep(steps, pMatch[1]);
       }
    }
  }

  // 方法2: 如果没找到步骤标题区域，回退到原来的逻辑（查找任意 ul）
  if (steps.length === 0) {
    const allUlMatches = articleContent.matchAll(/<ul>([\s\S]*?)<\/ul>/g);
    for (const ulMatch of allUlMatches) {
      const ulContent = ulMatch[1];
      const liMatches = ulContent.matchAll(/<li>([\s\S]*?)<\/li>/g);
      
      let foundInThisUl = false;
      for (const liMatch of liMatches) {
        if (addStep(steps, liMatch[1])) {
           foundInThisUl = true;
        }
      }
      
      // 如果在一个ul里找到了步骤，通常后面的ul可能是其他内容，但也可能是步骤续集
      // 这里我们可以稍微宽松点，如果已经找到足够多的步骤(>3)，可能就不用继续找了
      // 但为了防止漏掉，我们不强制break，除非明确遇到非步骤内容
    }
  }

  // 方法3: 全文按数字编号提取（最后备选）
  if (steps.length === 0) {
    const allText = cleanHTMLText(articleContent);
    const numberedSteps = allText.match(/\d+[\.。、]\s*[^0-9]+/g);
    if (numberedSteps && numberedSteps.length >= 2) {
      numberedSteps.forEach((step, index) => {
        const stepText = step.replace(/^\d+[\.。、]\s*/, '').trim();
        // 验证文本长度和内容
        if (isValidStep(stepText)) {
          steps.push({
            step: steps.length + 1,
            description: stepText,
          });
        }
      });
    }
  }

  // 如果仍然没有步骤，至少生成一个默认步骤
  if (steps.length === 0) {
    steps.push({
      step: 1,
      description: '按照传统方法制作',
      image: '' // 预留图片字段
    });
  }

  return steps;
}

/**
 * 辅助函数：添加单个步骤
 * 返回是否成功添加
 */
function addStep(steps, htmlContent) {
  let stepText = cleanHTMLText(htmlContent);
  
  // 移除strong标签中的步骤标题
  stepText = stepText.replace(/^<strong>([^<]+)<\/strong>[：:]\s*/, '');
  stepText = stepText.replace(/^[^：:]+[：:]\s*/, '');

  // 过滤无效步骤
  if (!isValidStep(stepText)) {
    return false;
  }

  // 尝试提取编号（解决从步骤2开始的问题）
  const numMatch = stepText.match(/^(\d+)[\.。、]\s*/);
  let explicitNum = null;
  if (numMatch) {
     explicitNum = parseInt(numMatch[1]);
     stepText = stepText.replace(/^(\d+)[\.。、]\s*/, '');
  }

  // 如果提取到了明确的编号 1，重置之前的步骤（可能是误判的垃圾数据）
  if (explicitNum === 1 && steps.length > 0 && steps.length < 3) {
      // 只有当前面步骤很少时才敢重置，防止误判
      // 或者我们可以只用 explicitNum 来排序
  }

  steps.push({
    step: steps.length + 1, // 总是重新生成连续编号
    description: stepText,
    originalNum: explicitNum // 保存原始编号以备调试
  });
  
  return true;
}

/**
 * 辅助函数：验证步骤文本是否有效
 */
function isValidStep(text) {
  if (!text || text.length < 5) return false; // 放宽字数限制到5
  
  // 过滤掉包含这些关键词的“非步骤”文本
  if (text.includes('注意事项') || 
      text.includes('小贴士') || 
      text.includes('特色') ||
      text.includes('功效') ||
      text.includes('准备原料') || 
      text.includes('质量标准') || // 新增：过滤质量标准
      text.includes('规格：') ||    // 新增：过滤规格描述
      text.includes('色泽：') ||    // 新增：过滤色泽描述
      text.includes('组织：') ||    // 新增：过滤组织描述
      text.includes('口味：') ||    // 新增：过滤口味描述
      (text.includes('主料') && text.includes('辅料')) ||
      (text.match(/^(准备)?(原料|材料|食材|配方)[：:]?/) && !text.includes('做法'))) {
    return false;
  }
  
  return true;
}

/**
 * 清理HTML文本
 */
function cleanHTMLText(text) {
  if (!text) return '';
  
  return text
    // 先处理嵌套的HTML标签，保留文本内容
    .replace(/<strong>([^<]+)<\/strong>/g, '$1')
    .replace(/<b>([^<]+)<\/b>/g, '$1')
    .replace(/<em>([^<]+)<\/em>/g, '$1')
    .replace(/<span[^>]*>([^<]+)<\/span>/g, '$1')
    .replace(/<a[^>]*>([^<]+)<\/a>/g, '$1')
    // 移除其他HTML标签
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, ' ')
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<div[^>]*>/g, ' ')
    .replace(/<\/div>/g, ' ')
    .replace(/<li>/g, ' ')
    .replace(/<\/li>/g, ' ')
    .replace(/<ul>/g, ' ')
    .replace(/<\/ul>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    // 处理HTML实体
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&hellip;/g, '...')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    // 清理多余空白
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 批量处理HTML文件
 */
function batchParseRecipes(recipeDir, outputFile) {
  console.log(`开始解析菜谱文件，目录: ${recipeDir}`);
  
  const recipes = [];
  let successCount = 0;
  let failCount = 0;

  // 读取目录中的所有HTML文件
  const files = fs.readdirSync(recipeDir)
    .filter(file => file.endsWith('.html'))
    .sort((a, b) => {
      // 按数字排序：1.html, 2.html, ...
      const numA = parseInt(a.replace('.html', '')) || 0;
      const numB = parseInt(b.replace('.html', '')) || 0;
      return numA - numB;
    });

  console.log(`找到 ${files.length} 个HTML文件`);

  for (const file of files) {
    const filePath = path.join(recipeDir, file);
    
    try {
      const htmlContent = readHTMLFile(filePath);
      const recipe = parseRecipeHTML(htmlContent);
      
      // 放宽条件：只要有名称就接受，步骤可以为空（会生成默认步骤）
      if (recipe && recipe.name && recipe.name !== '未知菜谱') {
        // 如果没有步骤，至少确保有一个默认步骤
        if (recipe.steps.length === 0) {
          recipe.steps = [{
            step: 1,
            description: '按照传统方法制作',
          }];
        }
        
        recipes.push(recipe);
        successCount++;
        
        // 每100个输出一次进度，前10个输出详细信息用于调试
        if (successCount <= 10) {
          console.log(`✓ [${successCount}] ${recipe.name} - 分类: ${recipe.category.join(',')}, 食材: ${recipe.ingredients.length}个, 步骤: ${recipe.steps.length}个`);
        } else if (successCount % 100 === 0) {
          console.log(`已解析 ${successCount} 个菜谱...`);
        }
      } else {
        failCount++;
        const reason = !recipe ? '解析返回null' : 
                      !recipe.name ? '缺少名称' : 
                      recipe.name === '未知菜谱' ? '无法提取名称' : '未知原因';
        if (failCount <= 10) {
          console.warn(`✗ 跳过文件 ${file}: ${reason}`);
        }
      }
    } catch (error) {
      failCount++;
      console.error(`处理文件 ${file} 时出错:`, error.message);
    }
  }

  // 保存结果（确保使用UTF-8编码）
  const outputPath = path.join(__dirname, '..', outputFile);
  const jsonContent = JSON.stringify(recipes, null, 2);
  // 使用UTF-8编码保存，确保中文字符正确
  fs.writeFileSync(outputPath, jsonContent, 'utf-8');

  console.log('\n解析完成！');
  console.log(`成功: ${successCount} 个`);
  console.log(`失败: ${failCount} 个`);
  console.log(`输出文件: ${outputPath}`);
  
  return recipes;
}

// 主函数
const recipeDir = process.argv[2] || 'D:/recipe';
const outputFile = process.argv[3] || 'parsed_recipes.json';

if (!fs.existsSync(recipeDir)) {
  console.error(`错误: 目录不存在 ${recipeDir}`);
  console.log('用法: node parseRecipes.js [菜谱目录] [输出文件名]');
  console.log('示例: node parseRecipes.js D:/recipe parsed_recipes.json');
  process.exit(1);
}

batchParseRecipes(recipeDir, outputFile);


