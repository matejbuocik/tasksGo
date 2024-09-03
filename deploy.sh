#!/bin/bash

VITE_API_URL='https://tasks.matjb.dev' ./build.sh
scp -r build craftingTable:/home/matej/tasks/
rm -r build/
