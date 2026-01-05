# ==============================================================================
# NEXUS-MARINE PROJECT MAKEFILE
# Phase: Full Stack (Infrastructure, Backend, Frontend)
# ==============================================================================

# Variables
BACKEND_DIR = backend
CDK_DIR = cdk
FRONTEND_DIR = frontend

.PHONY: help install build deploy clean test destroy docker-proof docker-cleanup

# Default target: Help
help:
	@echo "Nexus-Marine Management Commands"
	@echo "==================================="
	@echo "make install    : Install dependencies for Backend, Frontend, and CDK"
	@echo "make build      : Compile TypeScript for Backend, Frontend, and CDK"
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
	@echo "Installing Frontend Dependencies..."
	cd $(FRONTEND_DIR) && npm install
	@echo "Installing CDK Dependencies..."
	cd $(CDK_DIR) && npm install
	@echo "Installation Complete."

# ------------------------------------------------------------------------------
# 2. BUILD
# ------------------------------------------------------------------------------
# Note: Requires .env file with VITE_API_URL to be present in frontend/
build:
	@echo "Building Backend..."
	cd $(BACKEND_DIR) && npm run build
	@echo "Building Frontend (Vite)..."
	cd $(FRONTEND_DIR) && npm run build
	@echo "Building CDK..."
	cd $(CDK_DIR) && npm run build
	@echo "Build Complete."

# ------------------------------------------------------------------------------
# 3. DEPLOYMENT
# ------------------------------------------------------------------------------
# --require-approval never: Auto-approves IAM changes (Good for Dev, risky for Prod)
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
	@echo "Running Backend Unit Tests..."
	cd $(BACKEND_DIR) && npm test
	@echo "Running CDK Infrastructure Tests..."
	cd $(CDK_DIR) && npm test
	@echo "All Tests Passed."

clean:
	@echo "Cleaning up..."
	rm -rf $(BACKEND_DIR)/node_modules $(BACKEND_DIR)/dist
	rm -rf $(FRONTEND_DIR)/node_modules $(FRONTEND_DIR)/dist
	rm -rf $(CDK_DIR)/node_modules $(CDK_DIR)/cdk.out $(CDK_DIR)/dist
	@echo "Clean."

# ------------------------------------------------------------------------------
# 5. ENTERPRISE CHECKS
# ------------------------------------------------------------------------------
docker-proof:
	@echo "Verifying Docker Build Capability..."
	cd backend && docker build -f src/orders/Dockerfile -t nexus-orders-service .
	@echo "Docker Build Successful! (Ready for ECS/EKS Migration)"

docker-cleanup:
	@echo "Cleaning up Docker images..."
	docker system prune -f
	@echo "Docker Cleanup Complete."