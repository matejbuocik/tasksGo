#!/bin/bash

rm -rf build
mkdir build

go build
mv tasksGo build/

cd frontend
npm run build
mv dist ../build/static

cd ../build
./tasksGo
