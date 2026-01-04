# ==============================================================================
# NEXUS-MARINE PROJECT MAKEFILE
# (Infrastructure, Telemetry, Events, Orders)
# ==============================================================================

# Variables
BACKEND_DIR = backend
CDK_DIR = cdk

.PHONY: help install build deploy clean test

# Default target: Help
help:
	@echo "Nexus-Marine Management Commands"
	@echo "==================================="
	@echo "make install    : Install dependencies for Backend and CDK"
	@echo "make build      : Compile TypeScript for Backend and CDK"
	@echo "make deploy     : Deploy all CDK stacks to AWS (npx cdk deploy --all)"
	@echo "make destroy    : Destroy all stacks (CAUTION!)"
	@echo "make test       : Run unit tests"
	@echo "make clean      : Remove build artifacts and node_modules"

# ------------------------------------------------------------------------------
# 1. SETUP & INSTALLATION
# ------------------------------------------------------------------------------
install:
	@echo "Installing Backend Dependencies..."
	cd $(BACKEND_DIR) && npm install
	@echo "Installing CDK Dependencies..."
	cd $(CDK_DIR) && npm install
	@echo "Installation Complete."

# ------------------------------------------------------------------------------
# 2. BUILD
# ------------------------------------------------------------------------------
build:
	@echo "Building Backend..."
	cd $(BACKEND_DIR) && npm run build
	@echo "Building CDK..."
	cd $(CDK_DIR) && npm run build
	@echo "Build Complete."

# ------------------------------------------------------------------------------
# 3. DEPLOYMENT (The command you asked for)
# ------------------------------------------------------------------------------
deploy: build
	@echo "Deploying to AWS..."
	cd $(CDK_DIR) && npx cdk deploy --all --require-approval never

# ------------------------------------------------------------------------------
# 4. UTILITIES
# ------------------------------------------------------------------------------
destroy:
	@echo "Destroying Stacks..."
	cd $(CDK_DIR) && npx cdk destroy --all --force

test:
	@echo "Running Tests..."
	cd $(BACKEND_DIR) && npm test
	cd $(CDK_DIR) && npm test

clean:
	@echo "Cleaning up..."
	rm -rf $(BACKEND_DIR)/node_modules $(BACKEND_DIR)/dist
	rm -rf $(CDK_DIR)/node_modules $(CDK_DIR)/cdk.out $(CDK_DIR)/dist
	@echo "Clean."