#!/bin/bash
(cd $(dirname "$0") && cd .. && tsc -b) || exit 1
(cd $(dirname "$0") && tsc -b) || exit 1
node "$(dirname "$0")/src/main.js" pipeline "$@"
