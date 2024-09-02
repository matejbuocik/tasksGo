#!/bin/bash

rm -rf build
mkdir build

go build
mv tasksGo build/

cd frontend
npm i
npm run build
mv dist ../build/static

cd ..
