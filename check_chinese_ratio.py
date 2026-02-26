#!/usr/bin/env python3
"""
中文占比检查脚本
检查 poly-knowledge/**/*.md 文件的英文占比是否超过阈值

用法:
    python check_chinese_ratio.py [--threshold PERCENTAGE] [path ...]

参数:
    --threshold: 英文占比阈值 (默认 25)
    path: 要检查的文件或目录 (默认 poly-knowledge/**/*.md)
"""

import os
import re
import sys
import argparse
from pathlib import Path
from typing import List, Tuple

# 正则表达式
FRONTMATTER_PATTERN = re.compile(r'^---\s*\n.*?\n---\s*\n', re.DOTALL)
CODE_FENCE_PATTERN = re.compile(r'```[\s\S]*?```', re.MULTILINE)
URL_PATTERN = re.compile(r'https?://\S+')


def remove_frontmatter(content: str) -> str:
    """移除 frontmatter (--- 之间的内容)"""
    return FRONTMATTER_PATTERN.sub('', content)


def remove_code_fences(content: str) -> str:
    """移除代码块 (```...```)"""
    return CODE_FENCE_PATTERN.sub('', content)


def remove_urls(content: str) -> str:
    """移除 URLs"""
    return URL_PATTERN.sub('', content)


def count_chinese_and_english(text: str) -> Tuple[int, int]:
    """
    统计中英文字符数量
    
    返回: (中文字符数, 英文字母数)
    """
    chinese_chars = 0
    english_letters = 0
    
    for char in text:
        # 中文字符 Unicode 范围
        if '\u4e00' <= char <= '\u9fff':
            chinese_chars += 1
        # 英文字母 (a-z, A-Z)
        elif char.isalpha() and ord(char) < 128:
            english_letters += 1
    
    return chinese_chars, english_letters


def calculate_english_ratio(text: str) -> float:
    """
    计算英文占比
    
    返回: 英文占比 (0-100)
    """
    # 预处理：移除不需要检查的内容
    text = remove_frontmatter(text)
    text = remove_code_fences(text)
    text = remove_urls(text)
    
    chinese_chars, english_letters = count_chinese_and_english(text)
    
    total = chinese_chars + english_letters
    if total == 0:
        return 0.0
    
    return (english_letters / total) * 100


def check_file(file_path: Path, threshold: float) -> Tuple[bool, float, str]:
    """
    检查单个文件
    
    返回: (是否通过, 英文占比, 错误信息)
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return False, 0.0, f"读取文件失败: {e}"
    
    ratio = calculate_english_ratio(content)
    passed = ratio <= threshold
    
    return passed, ratio, ""


def find_md_files(paths: List[str]) -> List[Path]:
    """查找所有 md 文件"""
    md_files = []
    
    for path_str in paths:
        path = Path(path_str)
        
        if path.is_file():
            if path.suffix == '.md':
                md_files.append(path)
        elif path.is_dir():
            # 递归查找所有 .md 文件
            md_files.extend(path.rglob('*.md'))
    
    return sorted(md_files)


def main():
    parser = argparse.ArgumentParser(
        description='检查 poly-knowledge/**/*.md 文件的中文占比'
    )
    parser.add_argument(
        '--threshold', 
        type=float, 
        default=25,
        help='英文占比阈值 (默认 25)'
    )
    parser.add_argument(
        'paths',
        nargs='*',
        default=['poly-knowledge'],
        help='要检查的文件或目录 (默认 poly-knowledge)'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='显示详细信息'
    )
    
    args = parser.parse_args()
    
    # 查找所有 md 文件
    md_files = find_md_files(args.paths)
    
    if not md_files:
        print("未找到任何 .md 文件")
        sys.exit(0)
    
    if args.verbose:
        print(f"检查 {len(md_files)} 个文件...")
        print(f"阈值: {args.threshold}%\n")
    
    # 检查每个文件
    failed_files = []
    
    for md_file in md_files:
        passed, ratio, error = check_file(md_file, args.threshold)
        
        if error:
            print(f"❌ {md_file}: {error}")
            failed_files.append((md_file, ratio, error))
        elif not passed:
            status = f"❌ 英文占比 {ratio:.1f}% 超过阈值 {args.threshold}%"
            if args.verbose:
                print(f"{md_file}: {status}")
            failed_files.append((md_file, ratio, status))
        else:
            if args.verbose:
                print(f"✓ {md_file}: 英文占比 {ratio:.1f}%")
    
    # 输出结果
    print(f"\n{'='*50}")
    print(f"检查完成: {len(md_files) - len(failed_files)}/{len(md_files)} 通过")
    
    if failed_files:
        print(f"\n以下文件英文占比超过 {args.threshold}%:")
        for file, ratio, msg in failed_files:
            if args.verbose:
                print(f"  - {file}: {ratio:.1f}%")
            else:
                print(f"  - {file}")
        
        print("\n请将以下内容翻译为中文:")
        for file, ratio, msg in failed_files:
            print(f"  - {file}")
        
        sys.exit(1)
    else:
        print(f"\n✓ 所有文件英文占比均在 {args.threshold}% 以内")
        sys.exit(0)


if __name__ == '__main__':
    main()
