#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接解析recipe_new文件夹中的每个HTML文件，提取菜谱信息并保存
"""

import json
import re
import os
from pathlib import Path
from typing import Dict, List, Optional, Any


def clean_html_text(text: str) -> str:
    """清理HTML文本，移除标签和实体"""
    if not text:
        return ''
    
    # 先处理嵌套的HTML标签，保留文本内容
    text = re.sub(r'<strong>([^<]+)</strong>', r'\1', text)
    text = re.sub(r'<b>([^<]+)</b>', r'\1', text)
    text = re.sub(r'<em>([^<]+)</em>', r'\1', text)
    text = re.sub(r'<span[^>]*>([^<]+)</span>', r'\1', text)
    text = re.sub(r'<a[^>]*>([^<]+)</a>', r'\1', text)
    
    # 移除其他HTML标签
    text = re.sub(r'<p>', '', text)
    text = re.sub(r'</p>', ' ', text)
    text = re.sub(r'<br\s*/?>', ' ', text)
    text = re.sub(r'<div[^>]*>', ' ', text)
    text = re.sub(r'</div>', ' ', text)
    text = re.sub(r'<li>', ' ', text)
    text = re.sub(r'</li>', ' ', text)
    text = re.sub(r'<ul>', ' ', text)
    text = re.sub(r'</ul>', ' ', text)
    text = re.sub(r'<[^>]+>', ' ', text)
    
    # 处理HTML实体
    text = text.replace('&ldquo;', '"')
    text = text.replace('&rdquo;', '"')
    text = text.replace('&lsquo;', "'")
    text = text.replace('&rsquo;', "'")
    text = text.replace('&hellip;', '...')
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&amp;', '&')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&quot;', '"')
    
    # 清理空白字符
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    
    return text


def read_html_file(file_path: str) -> Optional[str]:
    """读取HTML文件，自动检测编码"""
    try:
        # 优先尝试UTF-8，然后是GBK/GB2312
        encodings = ['utf-8', 'gbk', 'gb2312', 'gb18030']
        
        for enc in encodings:
            try:
                with open(file_path, 'r', encoding=enc, errors='ignore') as f:
                    content = f.read()
                    # 检查是否包含关键中文内容
                    if '主料' in content or '辅料' in content or '做法步骤' in content or 'recipe_De_title' in content:
                        return content
            except (UnicodeDecodeError, LookupError):
                continue
        
        # 如果都失败，使用UTF-8并忽略错误
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except Exception as e:
        print(f"⚠ 读取HTML文件失败 {file_path}: {e}")
        return None


def extract_recipe_name(html_content: str) -> str:
    """提取菜名"""
    # 方法1: 从 h1.recipe_De_title 提取
    h1_match = re.search(r'<h1[^>]*class="recipe_De_title"[^>]*><a[^>]*>([^<]+)</a></h1>', html_content)
    if h1_match:
        return clean_html_text(h1_match.group(1)).strip()
    
    # 方法2: 从 title 标签提取
    title_match = re.search(r'<title>([^<]+)</title>', html_content)
    if title_match:
        name = title_match.group(1)
        name = re.sub(r'的做法.*$', '', name)
        name = re.sub(r'怎么做.*$', '', name)
        name = re.sub(r'_.*$', '', name)
        return name.strip()
    
    return '未知菜谱'


def extract_ingredients_from_html(html_content: str) -> Dict[str, List[Dict]]:
    """从HTML中提取主料和辅料"""
    result = {
        '主料': [],
        '辅料': [],
    }
    
    if not html_content:
        return result
    
    # 查找所有 fieldset.particulars 结构
    particulars_matches = list(re.finditer(r'<fieldset[^>]*class="particulars"[^>]*>([\s\S]*?)</fieldset>', html_content))
    
    for fieldset_match in particulars_matches:
        fieldset_content = fieldset_match.group(1)
        
        # 检查是主料还是辅料
        is_main = '主料' in fieldset_content or '<legend[^>]*>主料</legend>' in fieldset_content
        is_sub = '辅料' in fieldset_content or '<legend[^>]*>辅料</legend>' in fieldset_content
        
        # 查找ul标签
        ul_match = re.search(r'<ul>([\s\S]*?)</ul>', fieldset_content)
        if not ul_match:
            continue
        
        ul_content = ul_match.group(1)
        # 提取每个 <li> 中的食材
        li_matches = list(re.finditer(r'<li>([\s\S]*?)</li>', ul_content))
        
        for li_match in li_matches:
            li_text = li_match.group(1)
            
            # 提取食材名称 - 从 <b> 标签（可能在 <a> 标签内）
            ingredient_name = ''
            # 先尝试 <a><b> 结构
            a_b_match = re.search(r'<a[^>]*><b>([^<]+)</b></a>', li_text)
            if a_b_match:
                ingredient_name = clean_html_text(a_b_match.group(1)).strip()
            else:
                # 再尝试单独的 <b> 标签
                b_match = re.search(r'<b>([^<]+)</b>', li_text)
                if b_match:
                    ingredient_name = clean_html_text(b_match.group(1)).strip()
            
            # 提取数量 - 从 category_s2 类
            quantity = '适量'
            quantity_match = re.search(r'<span[^>]*class="category_s2"[^>]*>([^<]+)</span>', li_text)
            if quantity_match:
                quantity = clean_html_text(quantity_match.group(1)).strip()
            
            if ingredient_name:
                ingredient = {
                    'name': ingredient_name,
                    'quantity': quantity,
                }
                
                if is_main:
                    result['主料'].append(ingredient)
                elif is_sub:
                    result['辅料'].append(ingredient)
                else:
                    # 如果无法判断，默认作为主料
                    result['主料'].append(ingredient)
    
    return result


def extract_steps_from_html(html_content: str) -> List[Dict]:
    """从HTML中提取做法步骤"""
    steps = []
    
    if not html_content:
        return steps
    
    # 查找 recipeStep div - 需要找到匹配的结束标签
    recipe_step_start = html_content.find('class="recipeStep"')
    if recipe_step_start == -1:
        return steps
    
    # 找到开始标签的结束位置
    start_tag_end = html_content.find('>', recipe_step_start)
    if start_tag_end == -1:
        return steps
    
    # 从开始标签后查找匹配的 </div>，处理嵌套div
    remaining = html_content[start_tag_end + 1:]
    depth = 1
    end_pos = -1
    
    for j in range(len(remaining) - 5):
        substr4 = remaining[j:j+4]
        substr6 = remaining[j:j+6]
        
        # 检查是否是 <div 开始标签
        if substr4 == '<div' and j + 4 < len(remaining) and remaining[j+4] in [' ', '>', '\n', '\t']:
            depth += 1
        # 检查是否是 </div> 结束标签
        elif substr6 == '</div>':
            depth -= 1
            if depth == 0:
                end_pos = j
                break
    
    if end_pos == -1:
        return steps
    
    recipe_step_content = remaining[:end_pos]
    
    # 查找ul标签
    ul_match = re.search(r'<ul>([\s\S]*?)</ul>', recipe_step_content)
    if not ul_match:
        return steps
    
    ul_content = ul_match.group(1)
    
    # 找到所有 <li> 的开始位置
    li_start_positions = []
    search_pos = 0
    while True:
        pos = ul_content.find('<li>', search_pos)
        if pos == -1:
            break
        li_start_positions.append(pos)
        search_pos = pos + 4
    
    # 对每个 <li>，提取步骤内容
    for i, start_pos in enumerate(li_start_positions):
        next_li_pos = li_start_positions[i + 1] if i < len(li_start_positions) - 1 else len(ul_content)
        
        # 在当前 <li> 和下一个 <li> 之间查找 </li>
        li_section = ul_content[start_pos:next_li_pos]
        li_end_match = re.search(r'</li>', li_section)
        if not li_end_match:
            continue
        
        li_content = li_section[4:li_end_match.start()]
        
        # 提取步骤图片 - 从 recipeStep_img
        step_image = ''
        img_div_match = re.search(r'<div[^>]*class="recipeStep_img"[^>]*>[\s\S]*?<img[^>]*(?:data-src|src)="([^"]+)"', li_content)
        if img_div_match:
            step_image = img_div_match.group(1)
        else:
            # 如果没有找到，尝试直接匹配img标签
            img_match = re.search(r'<img[^>]*(?:data-src|src)="([^"]+)"', li_content)
            if img_match:
                step_image = img_match.group(1)
        
        # 提取步骤文字 - 从 recipeStep_word
        step_text = ''
        word_div_start = li_content.find('class="recipeStep_word"')
        
        if word_div_start != -1:
            # 找到开始标签的结束位置
            start_tag_end = li_content.find('>', word_div_start)
            if start_tag_end != -1:
                # 从开始标签后提取内容，需要找到匹配的 </div>
                remaining = li_content[start_tag_end + 1:]
                depth = 1
                end_pos = -1
                
                # 查找匹配的 </div>，处理嵌套div（如 <div class="grey">）
                for j in range(len(remaining) - 5):
                    substr4 = remaining[j:j+4]
                    substr6 = remaining[j:j+6]
                    
                    # 检查是否是 <div 开始标签
                    if substr4 == '<div' and j + 4 < len(remaining) and remaining[j+4] in [' ', '>', '\n', '\t']:
                        depth += 1
                    # 检查是否是 </div> 结束标签
                    elif substr6 == '</div>':
                        depth -= 1
                        if depth == 0:
                            end_pos = j
                            break
                
                if end_pos > 0:
                    content = remaining[:end_pos]
                    # 先移除步骤编号的 <div class="grey"> 标签
                    content = re.sub(r'<div[^>]*class="grey"[^>]*>[\s\S]*?</div>', '', content)
                    # 然后清理其他HTML标签，只保留文本
                    step_text = clean_html_text(content)
        
        # 如果方法1失败，从li中直接提取文本（排除图片部分）
        if not step_text or len(step_text) < 3:
            # 移除图片部分
            text_content = re.sub(r'<div[^>]*class="recipeStep_img"[^>]*>[\s\S]*?</div>', '', li_content)
            # 移除步骤编号div
            text_content = re.sub(r'<div[^>]*class="grey"[^>]*>[\s\S]*?</div>', '', text_content)
            step_text = clean_html_text(text_content)
        
        # 清理步骤文本
        if step_text:
            # 移除步骤编号（可能在开头）
            step_text = re.sub(r'^\d+[\.。、]?\s*', '', step_text).strip()
            # 移除多余空白
            step_text = re.sub(r'\s+', ' ', step_text).strip()
            
            # 如果文本长度足够，添加到步骤列表
            if len(step_text) > 2:
                steps.append({
                    'step': len(steps) + 1,
                    'description': step_text,
                    'image': step_image if step_image else None,
                })
    
    return steps


def extract_recipe_metadata(html_content: str) -> Dict[str, Any]:
    """从HTML中提取口味、工艺、耗时、难度等信息"""
    metadata = {
        'taste': '',      # 口味
        'craft': '',      # 工艺
        'difficulty': '',  # 难度
        'time': '',       # 耗时（原始文本）
    }
    
    if not html_content:
        return metadata
    
    # 提取口味 - 格式: <span class="category_s1"><a title="咸鲜">咸鲜</a></span><span class="category_s2">口味</span>
    # 使用更精确的匹配，确保category_s2紧跟在category_s1之后
    taste_match = re.search(r'<span[^>]*class="category_s1"[^>]*>\s*<a[^>]*title="([^"]+)"[^>]*>[^<]*</a>\s*</span>\s*<span[^>]*class="category_s2"[^>]*>口味</span>', html_content)
    if taste_match:
        metadata['taste'] = taste_match.group(1)
    
    # 提取工艺 - 格式: <span class="category_s1"><a title="煮">煮</a></span><span class="category_s2">工艺</span>
    craft_match = re.search(r'<span[^>]*class="category_s1"[^>]*>\s*<a[^>]*title="([^"]+)"[^>]*>[^<]*</a>\s*</span>\s*<span[^>]*class="category_s2"[^>]*>工艺</span>', html_content)
    if craft_match:
        metadata['craft'] = craft_match.group(1)
    
    # 提取耗时 - 格式: <span class="category_s1"><a title="三刻钟">三刻钟</a></span><span class="category_s2">耗时</span>
    time_match = re.search(r'<span[^>]*class="category_s1"[^>]*>\s*<a[^>]*title="([^"]+)"[^>]*>[^<]*</a>\s*</span>\s*<span[^>]*class="category_s2"[^>]*>耗时</span>', html_content)
    if time_match:
        metadata['time'] = time_match.group(1)
    
    # 提取难度 - 格式: <span class="category_s1"><a title="简单">简单</a></span><span class="category_s2">难度</span>
    difficulty_match = re.search(r'<span[^>]*class="category_s1"[^>]*>\s*<a[^>]*title="([^"]+)"[^>]*>[^<]*</a>\s*</span>\s*<span[^>]*class="category_s2"[^>]*>难度</span>', html_content)
    if difficulty_match:
        metadata['difficulty'] = difficulty_match.group(1)
    
    return metadata


def format_recipe_output(recipe_name: str, ingredients_detail: Dict, metadata: Dict, steps: List[Dict]) -> str:
    """格式化单个菜谱的输出"""
    output_lines = []
    
    # 菜名
    output_lines.append(f"【菜名】{recipe_name}")
    output_lines.append("")
    
    # 食材明细
    output_lines.append("【食材明细】")
    if ingredients_detail.get('主料'):
        output_lines.append("主料：")
        for ing in ingredients_detail['主料']:
            qty = ing.get('quantity', '')
            if qty:
                output_lines.append(f"  - {ing['name']}: {qty}")
            else:
                output_lines.append(f"  - {ing['name']}")
    
    if ingredients_detail.get('辅料'):
        output_lines.append("辅料：")
        for ing in ingredients_detail['辅料']:
            qty = ing.get('quantity', '')
            if qty:
                output_lines.append(f"  - {ing['name']}: {qty}")
            else:
                output_lines.append(f"  - {ing['name']}")
    
    if not ingredients_detail.get('主料') and not ingredients_detail.get('辅料'):
        output_lines.append("  暂无食材信息")
    
    output_lines.append("")
    
    # 口味、工艺、耗时、难度
    output_lines.append("【制作信息】")
    if metadata.get('taste'):
        output_lines.append(f"口味: {metadata['taste']}")
    if metadata.get('craft'):
        output_lines.append(f"工艺: {metadata['craft']}")
    if metadata.get('time'):
        output_lines.append(f"耗时: {metadata['time']}")
    if metadata.get('difficulty'):
        output_lines.append(f"难度: {metadata['difficulty']}")
    output_lines.append("")
    
    # 做法步骤
    output_lines.append("【做法步骤】")
    if steps:
        for step in steps:
            step_num = step.get('step', 0)
            desc = step.get('description', '')
            image = step.get('image', '')
            
            output_lines.append(f"步骤 {step_num}: {desc}")
            if image:
                output_lines.append(f"  图片: {image}")
    else:
        output_lines.append("  暂无步骤信息")
    
    output_lines.append("")
    output_lines.append("=" * 80)
    output_lines.append("")
    
    return "\n".join(output_lines)


def parse_html_file(html_file: Path) -> Optional[Dict]:
    """解析单个HTML文件"""
    html_content = read_html_file(str(html_file))
    if not html_content:
        return None
    
    # 提取菜名
    recipe_name = extract_recipe_name(html_content)
    
    # 提取食材
    ingredients_detail = extract_ingredients_from_html(html_content)
    
    # 提取步骤
    steps = extract_steps_from_html(html_content)
    
    # 提取元数据（口味、工艺、耗时、难度）
    metadata = extract_recipe_metadata(html_content)
    
    return {
        'name': recipe_name,
        'ingredients': ingredients_detail,
        'steps': steps,
        'metadata': metadata,
    }


def main():
    """主函数"""
    # 配置文件路径
    script_dir = Path(__file__).parent
    html_dir = script_dir / 'recipe_new'
    output_file = script_dir / 'recipes_extracted.txt'
    
    # 检查HTML目录是否存在
    if not html_dir.exists():
        print(f"❌ HTML目录不存在: {html_dir}")
        return
    
    # 获取所有HTML文件（文件名格式可能是 recipe-*.html 或 *.html）
    html_files = list(html_dir.glob('*.html'))
    if not html_files:
        print(f"⚠ 在 {html_dir} 中未找到HTML文件")
        return
    
    print(f"📖 找到 {len(html_files)} 个HTML文件")
    print(f"🔄 开始解析...")
    
    # 处理每个HTML文件
    output_lines = []
    output_lines.append("=" * 80)
    output_lines.append("菜谱提取结果")
    output_lines.append(f"共 {len(html_files)} 个菜谱")
    output_lines.append("=" * 80)
    output_lines.append("")
    
    processed = 0
    failed = 0
    
    for html_file in html_files:
        try:
            recipe_data = parse_html_file(html_file)
            if recipe_data:
                formatted = format_recipe_output(
                    recipe_data['name'],
                    recipe_data['ingredients'],
                    recipe_data['metadata'],
                    recipe_data['steps']
                )
                output_lines.append(formatted)
                processed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"⚠ 解析文件失败 {html_file.name}: {e}")
            failed += 1
        
        if (processed + failed) % 100 == 0:
            print(f"  已处理 {processed + failed}/{len(html_files)} 个文件... (成功: {processed}, 失败: {failed})")
    
    # 保存到文件
    print(f"💾 保存结果到: {output_file}")
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("\n".join(output_lines))
        print(f"✅ 成功保存 {processed} 个菜谱到 {output_file}")
        if failed > 0:
            print(f"⚠ 失败 {failed} 个文件")
    except Exception as e:
        print(f"❌ 保存文件失败: {e}")


if __name__ == '__main__':
    main()
