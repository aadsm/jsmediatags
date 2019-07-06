#!/usr/bin/env bash

npm install
npm run dist
npm run build
rm dist/jsmediatags.js
npm publish