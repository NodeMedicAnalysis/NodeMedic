#!/bin/bash

echo "Setting up dependencies"

echo "Cloning jalangi2"
git clone https://github.com/Samsung/jalangi2.git

echo "Creating jalangi2-babel"
mkdir jalangi2-babel
cp -r jalangi2/src jalangi2-babel/
cp jalangi2/package.json jalangi2-babel/

echo "Applying jalangi2-babel patch"
cd jalangi2-babel
git apply ../babel-changes.patch

echo "Installing npm dependencies"
npm i
npm i --save-dev @babel/core @babel/preset-env
