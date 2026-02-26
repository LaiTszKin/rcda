#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  echo ".env already exists"
  exit 0
fi

if [ -f .env.example ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
  exit 0
fi

touch .env
echo "Created empty .env"
