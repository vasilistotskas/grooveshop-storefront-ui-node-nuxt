#!/bin/sh
set -e

cd /mnt/app

npm i

npm run dev -o
