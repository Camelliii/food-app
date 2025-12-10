#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
删除所需食材为空的菜谱
"""

import json
from pathlib import Path

def remove_empty_recipes(input_file, output_file=None):
    """删除食材为空的菜谱"""
    
    if output_file is None:
        output_file = input_file
    
    print(f"正在读取文件: {input_file}")
    
    # 读取JSON文件
    with open(input_file, 'r', encoding='utf-8') as f:
        recipes = json.load(f)
    
    print(f"原始菜谱数量: {len(recipes)}")
    
    # 过滤掉食材为空的菜谱
    filtered_recipes = []
    removed_count = 0
    
    for recipe in recipes:
        # 检查是否有任何食材
        main_ingredients = recipe.get('main_ingredients', [])
        auxiliary_ingredients = recipe.get('auxiliary_ingredients', [])
        seasonings = recipe.get('seasonings', [])
        
        # 检查是否所有食材数组都为空
        has_ingredients = (
            (main_ingredients and len(main_ingredients) > 0) or
            (auxiliary_ingredients and len(auxiliary_ingredients) > 0) or
            (seasonings and len(seasonings) > 0)
        )
        
        if has_ingredients:
            filtered_recipes.append(recipe)
        else:
            removed_count += 1
            print(f"删除菜谱: {recipe.get('name', '未知')} (来源: {recipe.get('source_file', '未知')})")
    
    print(f"\n删除的菜谱数量: {removed_count}")
    print(f"保留的菜谱数量: {len(filtered_recipes)}")
    
    # 保存过滤后的数据
    print(f"\n正在保存到: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(filtered_recipes, f, ensure_ascii=False, indent=2)
    
    print("✓ 完成！")

if __name__ == '__main__':
    input_file = 'recipes_parsed.json'
    remove_empty_recipes(input_file)

