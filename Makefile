# TypeScript setup
TSC=tsc
TSC_FLAGS=-b

# Node setup
NODE=node
NODE_FLAGS=--trace-uncaught --stack-trace-limit=20
NODE_DEBUG_FLAGS=--trace-uncaught --inspect --inspect-brk

# Jalangi2 setup
JALANGI_DIR=lib/jalangi2-babel
JALANGI_CMD=${JALANGI_DIR}/src/js/commands/jalangi.js --analysis
ANALYSIS_FILE := src/rewrite.js

# Configuration
LOGLEVEL=error
POLICIES=string:precise,array:precise
TAINTPATHS=true
TAINTPATHSJSON=true

# Analysis arguments
ARGS_BASE=log_level=${LOGLEVEL} policies=${POLICIES} taint_paths=${TAINTPATHS} taint_paths_json=${TAINTPATHSJSON}
ARGS=$(ARGS_BASE) assert_passed=${ASSERTPASSED} eval_sink=${EVALSINK}
ARGS_TEST=$(ARGS_BASE) eval_sink=${EVALSINK} assert_passed=${ASSERTPASSED}

# Build
.PHONY: js.stub

js.stub:
	$(TSC) $(TSC_FLAGS)
	@touch $@

# Commands
analyze: js.stub
	$(NODE) $(NODE_FLAGS) $(JALANGI_CMD) ${ANALYSIS_FILE} ${FILE} $(ARGS)

debug: js.stub
	$(NODE) $(NODE_DEBUG_FLAGS) $(JALANGI_CMD) ${ANALYSIS_FILE} ${FILE} ${ARGS}

test: js.stub
	tsc -b tests/taint_precision/tests/
	$(NODE) $(NODE_FLAGS) tests/taint_precision/run_unit.js

run_one_test: js.stub
	tsc -b tests/taint_precision/tests/
	$(NODE) $(NODE_FLAGS) $(JALANGI_CMD) ${ANALYSIS_FILE} tests/taint_precision/tests/_build/taint_precision/tests/${TEST}.js $(ARGS_TEST)

run_one_test_debug: js.stub
	tsc -b tests/taint_precision/tests/
	$(NODE) $(NODE_DEBUG_FLAGS) $(JALANGI_CMD) ${ANALYSIS_FILE} tests/taint_precision/tests/_build/taint_precision/tests/${TEST}.js $(ARGS_TEST)

clean:
	find ./src -type f -name '*.js' -delete
	find ./src -type f -name '*.js.map' -delete
