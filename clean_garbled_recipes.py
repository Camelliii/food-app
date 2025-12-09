#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
清理 recipes_extracted.txt 中包含乱码的菜谱
"""

import re
from pathlib import Path


def contains_garbled_text(text: str) -> bool:
    """检测文本是否包含乱码"""
    # 乱码特征：包含类似 èŠ¦ç¬‹å¤‡å¥½ 这样的字符序列
    # 这些通常是 UTF-8 被错误解码为 Latin-1 或其他编码的结果
    
    # 检查是否包含常见的乱码模式
    garbled_patterns = [
        r'[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]',  # Latin-1 扩展字符
        r'[ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ]',  # Latin-1 扩展字符（大写）
        r'[€‚ƒ„…†‡ˆ‰Š‹ŒŽ''""•–—˜™š›œžŸ]',  # Windows-1252 特殊字符
    ]
    
    # 如果文本中包含大量这些字符，可能是乱码
    garbled_char_count = 0
    for pattern in garbled_patterns:
        matches = re.findall(pattern, text)
        garbled_char_count += len(matches)
    
    # 如果乱码字符数量超过文本长度的 10%，认为是乱码
    if len(text) > 0 and garbled_char_count > len(text) * 0.1:
        return True
    
    # 检查是否包含明显的乱码序列（连续的非ASCII拉丁字符）
    garbled_sequence = re.search(r'[à-ÿÀ-ÿ]{5,}', text)
    if garbled_sequence:
        return True
    
    # 检查是否包含中文字符（正常情况应该包含中文）
    # 如果一段文本很长但没有中文字符，可能是乱码
    chinese_chars = re.findall(r'[\u4e00-\u9fff]', text)
    if len(text) > 50 and len(chinese_chars) == 0:
        return True
    
    return False


def clean_recipes_file(input_file: Path, output_file: Path):
    """清理包含乱码的菜谱"""
    print(f"📖 读取文件: {input_file}")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ 读取文件失败: {e}")
        return
    
    # 按分隔符分割菜谱
    sections = content.split('=' * 80)
    
    # 处理头部信息
    header = sections[0] if sections else ''
    if '菜谱提取结果' in header:
        # 保留头部
        recipes_sections = sections[1:]
    else:
        recipes_sections = sections
    
    print(f"📊 找到 {len(recipes_sections)} 个菜谱块")
    
    # 清理菜谱
    cleaned_sections = []
    removed_count = 0
    
    for i, section in enumerate(recipes_sections):
        if not section.strip():
            continue
        
        # 检查是否包含乱码
        if contains_garbled_text(section):
            removed_count += 1
            # 提取菜名用于日志
            name_match = re.search(r'【菜名】(.+)', section)
            recipe_name = name_match.group(1).strip() if name_match else f"菜谱 {i+1}"
            print(f"  ❌ 删除乱码菜谱: {recipe_name[:30]}")
            continue
        
        cleaned_sections.append(section)
    
    print(f"✅ 清理完成: 保留 {len(cleaned_sections)} 个菜谱，删除 {removed_count} 个乱码菜谱")
    
    # 重新组合内容
    output_lines = []
    if header.strip():
        output_lines.append(header.strip())
        output_lines.append("")
    
    # 更新统计信息
    if '共' in header and '个菜谱' in header:
        # 更新数量
        header = re.sub(r'共\s+\d+\s+个菜谱', f'共 {len(cleaned_sections)} 个菜谱', header)
        output_lines = [header.strip(), ""]
    
    # 添加清理后的菜谱
    for section in cleaned_sections:
        output_lines.append('=' * 80)
        output_lines.append(section.strip())
    
    # 保存清理后的文件
    print(f"💾 保存到: {output_file}")
    try:
        with open(output_file, 'w', encoding='utf-8', errors='replace') as f:
            f.write('\n'.join(output_lines))
        print(f"✅ 成功保存清理后的文件")
    except Exception as e:
        print(f"❌ 保存文件失败: {e}")


def main():
    """主函数"""
    script_dir = Path(__file__).parent
    input_file = script_dir / 'recipes_extracted.txt'
    output_file = script_dir / 'recipes_extracted_cleaned.txt'
    
    if not input_file.exists():
        print(f"❌ 文件不存在: {input_file}")
        return
    
    clean_recipes_file(input_file, output_file)
    
    print(f"\n📝 提示: 清理后的文件已保存为 {output_file.name}")
    print(f"   如果确认无误，可以替换原文件:")
    print(f"   mv {output_file.name} recipes_extracted.txt")


if __name__ == '__main__':
    main()

