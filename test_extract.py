#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""测试提取功能"""

from extract_html import extract_steps_from_html, extract_recipe_metadata, read_html_file

# 测试文件
html = read_html_file('recipe_new/1.html')
if html:
    # 测试步骤提取
    steps = extract_steps_from_html(html)
    print(f'提取到 {len(steps)} 个步骤')
    print('前3个步骤:')
    for i, s in enumerate(steps[:3]):
        desc = s['description']
        print(f'步骤{i+1}: {desc[:50]}...')
    
    # 测试元数据提取
    meta = extract_recipe_metadata(html)
    print(f'\n元数据:')
    print(f'  口味: {meta["taste"]}')
    print(f'  工艺: {meta["craft"]}')
    print(f'  耗时: {meta["time"]}')
    print(f'  难度: {meta["difficulty"]}')
else:
    print('无法读取HTML文件')

