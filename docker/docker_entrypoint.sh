#!/bin/sh
set -e

cd /mnt/app

bun i

bun run dev -o
