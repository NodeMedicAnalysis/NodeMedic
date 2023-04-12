#!/bin/bash


echo "This script will install and execute vulnerable Node.js packages."
read -p "Continue? " -n 1 -r
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    [[ "$0" = "$BASH_SOURCE" ]] && exit 1 || return 1
fi
echo ""


echo "Running case study: accesslog"

(cd tests/case_studies/accesslog && npm i)
make analyze FILE=tests/case_studies/accesslog/run-accesslog.js
node tests/case_studies/accesslog/poc.js

echo "Done"


echo "Running case study: font-converter"

(cd tests/case_studies/font-converter && npm i)
make analyze FILE=tests/case_studies/font-converter/run-font-converter.js
node tests/case_studies/font-converter/poc.js
ls success

echo "Done"
