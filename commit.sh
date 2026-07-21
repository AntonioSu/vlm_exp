#!/bin/bash

# 快速提交脚本
# 用法: commit.sh "type(scope): 提交信息" [路径...]
# 示例: commit.sh "feat(ai): replace numeric confidence with 5-level labels"
# 示例: commit.sh "docs(writing): add week summary" writing_public/week_summary

usage='用法: commit.sh "type(scope): 提交信息" [路径...]'

if [ -z "$1" ]; then
    echo "$usage"
    exit 1
fi

cd "$(dirname "$0")" || exit 1

TYPES="feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert"

SCOPE='[^)]+'

if [[ "$1" =~ ^($TYPES)\($SCOPE\):\ .+ ]]; then
    MESSAGE="$1"
    shift
else
    echo "提交信息需使用 type(scope): message 格式。"
    echo "$usage"
    exit 1
fi

if [ $# -eq 0 ]; then
    git add .
else
    git add "$@"
fi

git commit -m "$MESSAGE"
git push origin wip-swy
