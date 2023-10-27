#!/bin/sh
set -e

cd /mnt/app
rm -rf node_modules && rm -rf .nuxt && rm -rf .output

npm i

npm run dev -o
