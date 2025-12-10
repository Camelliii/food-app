#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
从美食天下HTML页面提取菜谱信息
"""

from bs4 import BeautifulSoup
import json
import re
from pathlib import Path
from typing import List, Tuple, Union

def is_garbled_html(html_text: str) -> bool:
    """
    简易乱码检测：统计 '�' 出现次数并检查有效中文比例
    """
    if not html_text:
        return True
    unknown_count = html_text.count("�")
    if unknown_count >= 5:
        return True
    # 若缺乏明显中文且长度很短，也视为异常
    chinese_count = len(re.findall(r"[\u4e00-\u9fff]", html_text))
    if chinese_count < 10 and len(html_text) < 500:
        return True
    return False


def split_quantity(q: str) -> Tuple[str, str]:
    """
    将数量拆分为(数量, 单位)，适量/少许等无单位
    """
    if not q:
        return "", ""
    q = q.strip()
    # 适量/少许等直接返回
    for word in ["适量", "少许", "适当", "若干"]:
        if word in q:
            return word, ""

    # 形如 "2个"、"1/2勺"、"3.5 kg"
    match = re.match(r"([\d\.\/]+)\s*(.+)?", q)
    if match:
        amount = match.group(1).strip()
        unit = (match.group(2) or "").strip()
        return amount, unit

    # 无法识别则全部放数量
    return q, ""


def extract_recipe_info(html_file):
    """从HTML文件中提取菜谱信息"""
    
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 提取基本信息
    recipe = {
        'name': '',
        #'author': '',
        'description': '',
        #'recipe_id': '',
        'main_ingredients': [],
        'auxiliary_ingredients': [],
        'seasonings': [],
        'flavor': '',  # 口味
        'technique': '',  # 工艺
        'time': '',  # 耗时
        'difficulty': '',  # 难度
        'categories': [],  # 分类
        'cover_images': [],  # 封面图片
        'steps': [],  # 步骤（包含图片和文字）
        'tips': '',  # 小窍门
        'tools': '',  # 使用的厨具
    }
    
    # 1. 提取菜谱名称
    title_elem = soup.find('h1', class_='recipe_De_title')
    if title_elem:
        recipe['name'] = title_elem.get_text(strip=True).replace('独家', '').strip()
    
    # 或者从hidden input中获取
    title_input = soup.find('input', {'id': 'recipe_title'})
    if title_input and title_input.get('value'):
        recipe['name'] = title_input.get('value')
    
    # # 2. 提取作者
    # author_elem = soup.find('span', {'id': 'recipe_username'})
    # if author_elem:
    #     recipe['author'] = author_elem.get_text(strip=True)
    
    # # 3. 提取recipe_id
    # recipe_id_input = soup.find('input', {'id': 'recipe_id'})
    # if recipe_id_input:
    #     recipe['recipe_id'] = recipe_id_input.get('value', '')
    
    # 4. 提取描述
    block_txt = soup.find('blockquote', {'id': 'block_txt'})
    if block_txt:
        desc_div = block_txt.find('div', {'id': 'block_txt1'})
        if desc_div:
            desc_text = desc_div.get_text(strip=True)
            # 移除引号和特殊字符
            desc_text = desc_text.replace('"', '').replace('"', '').replace('"', '').replace('"', '').strip()
            recipe['description'] = desc_text
    
    # 5. 提取封面图片
    img_box = soup.find('div', {'id': 'recipe_De_imgBox'})
    if img_box:
        # 提取主图
        main_img = img_box.find('img')
        if main_img:
            img_src = main_img.get('src', '')
            # 如果是blank.gif，尝试获取data-src
            if 'blank.gif' in img_src:
                img_src = main_img.get('data-src', img_src)
            if img_src and 'blank.gif' not in img_src:
                recipe['cover_images'].append(img_src)
    
    # 从JavaScript中提取所有封面图片
    script_tags = soup.find_all('script')
    for script in script_tags:
        if not script.string:
            continue
        script_text = script.string
        
        # 提取 J_photo 数组
        if 'J_photo' in script_text and 'src' in script_text:
            # 匹配 var J_photo = [{...}];
            match = re.search(r'var\s+J_photo\s*=\s*(\[.*?\])', script_text, re.DOTALL)
            if match:
                json_str = match.group(1)
                try:
                    images_data = json.loads(json_str)
                    for img_data in images_data:
                        if isinstance(img_data, dict) and 'src' in img_data:
                            img_url = img_data['src']
                            if img_url not in recipe['cover_images']:
                                recipe['cover_images'].append(img_url)
                except json.JSONDecodeError:
                    # 如果JSON解析失败，尝试正则提取
                    img_urls = re.findall(r'"src"\s*:\s*"([^"]+)"', json_str)
                    for img_url in img_urls:
                        if img_url not in recipe['cover_images']:
                            recipe['cover_images'].append(img_url)
    
    # 6. 提取食材（主料、辅料、调料）
    particulars = soup.find_all('fieldset', class_='particulars')
    for fieldset in particulars:
        legend = fieldset.find('legend')
        if not legend:
            continue
        
        legend_text = legend.get_text(strip=True)
        ingredients = []
        
        li_tags = fieldset.find_all('li')
        for li in li_tags:
            # 提取食材名称
            name_elem = li.find('b')
            if not name_elem:
                name_elem = li.find('a')
            
            if name_elem:
                ingredient_name = name_elem.get_text(strip=True)
                
                # 提取数量并拆分
                quantity_elem = li.find('span', class_='category_s2')
                quantity_raw = quantity_elem.get_text(strip=True) if quantity_elem else ''
                amount, unit = split_quantity(quantity_raw)
                
                ingredients.append({
                    'name': ingredient_name,
                    'amount': amount,
                    'unit': unit
                })
        
        if legend_text == '主料':
            recipe['main_ingredients'] = ingredients
        elif legend_text == '辅料':
            recipe['auxiliary_ingredients'] = ingredients
        elif legend_text == '调料':
            recipe['seasonings'] = ingredients
    
    # 7. 提取口味、工艺、耗时、难度
    category_lists = soup.find_all('div', class_='recipeCategory_sub_R')
    for category_list in category_lists:
        li_tags = category_list.find_all('li')
        for li in li_tags:
            label_elem = li.find('span', class_='category_s2')
            value_elem = li.find('a')
            
            if label_elem and value_elem:
                label = label_elem.get_text(strip=True)
                value = value_elem.get_text(strip=True)
                
                if label == '口味':
                    recipe['flavor'] = value
                elif label == '工艺':
                    recipe['technique'] = value
                elif label == '耗时':
                    recipe['time'] = value
                elif label == '难度':
                    recipe['difficulty'] = value
    
    # 8. 提取分类
    category_links = soup.select('div.recipeTip.mt16 a[title]')
    for link in category_links:
        title = link.get('title', '')
        if title and title not in ['热菜', '家常菜']:  # 可以根据需要过滤
            if title in ['热菜', '家常菜', '凉菜', '汤羹', '主食', '小吃', '西餐', '烘焙', '饮品']:
                if title not in recipe['categories']:
                    recipe['categories'].append(title)
    
    # 也可以从路径中提取
    path_div = soup.find('div', {'id': 'path'})
    if path_div:
        category_links = path_div.find_all('a', class_='vest')
        for link in category_links:
            title = link.get('title', '')
            if title and title not in recipe['categories']:
                recipe['categories'].append(title)
    
    # 9. 提取烹饪步骤（包含图片）
    recipe_step_div = soup.find('div', class_='recipeStep')
    if recipe_step_div:
        li_tags = recipe_step_div.find_all('li')
        for li in li_tags:
            step_num_elem = li.find('div', class_='grey')
            step_text_elem = li.find('div', class_='recipeStep_word')
            
            step_num = step_num_elem.get_text(strip=True) if step_num_elem else ''
            step_text = ''
            
            if step_text_elem:
                # 移除步骤编号，只保留文本
                step_clone = step_text_elem.__copy__()
                grey_div = step_clone.find('div', class_='grey')
                if grey_div:
                    grey_div.decompose()
                step_text = step_clone.get_text(strip=True)
            
            if step_num or step_text:
                recipe['steps'].append({
                    'step': step_num,
                    'description': step_text
                })
    
    # 10. 提取小窍门
    # 查找包含"小窍门"的h3，然后找下一个recipeTip div
    h3_tags = soup.find_all('h3')
    for h3 in h3_tags:
        h3_text = h3.get_text(strip=True)
        if '小窍门' in h3_text or '小贴士' in h3_text:
            # h3的父div是class="mo"，下一个兄弟div是recipeTip
            parent = h3.parent
            if parent:
                # 查找父div的下一个兄弟div
                next_div = parent.find_next_sibling('div')
                if next_div and 'recipeTip' in next_div.get('class', []):
                    tips_html = str(next_div)
                    tip_text_check = next_div.get_text(strip=True)
                    # 检查是否包含无关信息
                    if '来自 美食天下' not in tip_text_check and '使用的厨具' not in tip_text_check and '所属分类' not in tip_text_check:
                        tips_soup = BeautifulSoup(tips_html, 'html.parser')
                        # 移除br标签，替换为换行
                        for br in tips_soup.find_all('br'):
                            br.replace_with('\n')
                        tips_text = tips_soup.get_text(strip=True)
                        if tips_text:
                            recipe['tips'] = tips_text
                            break
    
    # 11. 提取使用的厨具
    tip_divs = soup.find_all('div', class_='recipeTip')
    for tip_div in tip_divs:
        text = tip_div.get_text(strip=True)
        if '使用的厨具' in text or '厨具' in text:
            recipe['tools'] = text.replace('使用的厨具：', '').strip()
            break
    
    # 去重封面图片
    recipe['cover_images'] = list(dict.fromkeys(recipe['cover_images']))
    
    return recipe

def save_to_json(recipe, output_file):
    """保存为JSON文件"""
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(recipe, f, ensure_ascii=False, indent=2)
    print(f"✓ 数据已保存到: {output_file}")

def print_recipe_info(recipe):
    """打印菜谱信息"""
    print("=" * 60)
    print(f"菜谱名称: {recipe['name']}")
    #print(f"作者: {recipe['author']}")
    #print(f"菜谱ID: {recipe['recipe_id']}")
    print(f"描述: {recipe['description']}")
    print(f"分类: {', '.join(recipe['categories'])}")
    print(f"口味: {recipe['flavor']} | 工艺: {recipe['technique']} | 耗时: {recipe['time']} | 难度: {recipe['difficulty']}")
    print(f"使用的厨具: {recipe['tools']}")
    print("\n封面图片:")
    for img in recipe['cover_images']:
        print(f"  - {img}")
    
    def _fmt_ing(lst):
        for ing in lst:
            amount = ing.get('amount', '')
            unit = ing.get('unit', '')
            if amount and unit:
                yield f"{ing['name']}: {amount}{unit}"
            elif amount:
                yield f"{ing['name']}: {amount}"
            else:
                yield ing['name']

    print("\n主料:")
    for line in _fmt_ing(recipe['main_ingredients']):
        print(f"  - {line}")
    
    print("\n辅料:")
    for line in _fmt_ing(recipe['auxiliary_ingredients']):
        print(f"  - {line}")
    
    print("\n调料:")
    for line in _fmt_ing(recipe['seasonings']):
        print(f"  - {line}")
    
    print(f"\n烹饪步骤 (共{len(recipe['steps'])}步):")
    for step in recipe['steps']:
        print(f"\n步骤 {step['step']}:")
        print(f"  {step['description']}")
    
    if recipe['tips']:
        print(f"\n小窍门: {recipe['tips']}")
    
    print("=" * 60)

def process_directory(input_dir: Union[str, Path], output_file: Union[str, Path]) -> int:
    """批量处理目录中的HTML菜谱，边解析边写入JSON数组，返回成功数量"""
    input_dir = Path(input_dir)
    output_file = Path(output_file)
    
    if not input_dir.exists():
        raise FileNotFoundError(f"目录不存在: {input_dir}")
    
    html_files = sorted(input_dir.glob("*.htm*"))
    if not html_files:
        raise FileNotFoundError(f"目录中未找到HTML文件: {input_dir}")
    
    output_file.parent.mkdir(parents=True, exist_ok=True)
    print(f"开始处理目录: {input_dir}，共 {len(html_files)} 个HTML文件")
    
    written_count = 0
    first_written = False
    with open(output_file, "w", encoding="utf-8") as out:
        out.write("[\n")
        for html_path in html_files:
            try:
                content = html_path.read_text(encoding="utf-8", errors="ignore")
                if is_garbled_html(content):
                    print(f"✗ 检测为乱码，已删除: {html_path.name}")
                    html_path.unlink(missing_ok=True)
                    continue
                recipe = extract_recipe_info(html_path)
                recipe["source_file"] = html_path.name
                
                if first_written:
                    out.write(",\n")
                json.dump(recipe, out, ensure_ascii=False, indent=2)
                out.flush()
                
                first_written = True
                written_count += 1
                print(f"✓ 解析并写入: {html_path.name}")
            except Exception as e:
                print(f"✗ 解析失败: {html_path.name} -> {e}")
        out.write("\n]\n")
    
    print(f"完成，成功写入 {written_count} 条数据 -> {output_file}")
    return written_count

if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description="批量提取菜谱信息")
    parser.add_argument(
        "--dir",
        "-d",
        default="recipe_new",
        help="包含菜谱HTML的目录（默认: recipe_new）"
    )
    parser.add_argument(
        "--out",
        "-o",
        default="recipes_parsed.json",
        help="输出JSON文件路径（默认: recipes_parsed.json）"
    )
    parser.add_argument(
        "--file",
        "-f",
        help="仅处理单个HTML文件（若提供，将忽略--dir）"
    )
    args = parser.parse_args()

    try:
        if args.file:
            print(f"正在从 {args.file} 提取菜谱信息...")
            content = Path(args.file).read_text(encoding="utf-8", errors="ignore")
            if is_garbled_html(content):
                print(f"检测到文件乱码，已跳过: {args.file}")
            else:
                recipe = extract_recipe_info(args.file)
                print_recipe_info(recipe)
                save_to_json(recipe, args.out)
        else:
            process_directory(args.dir, args.out)
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()

