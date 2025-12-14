# Makefile for kiro-steering-loader

# Project name (change this to match your project)
PROJECT_NAME := kiro-steering-loader
VERSION := $(shell node -p "require('./package.json').version")
ZIP_NAME := $(PROJECT_NAME)-$(VERSION).zip

.PHONY: zip clean help

# Default target
.DEFAULT_GOAL := help

## Create a zip file respecting .gitignore rules
zip:
	@echo "Creating $(ZIP_NAME)..."
	@git archive --format=zip --output=$(ZIP_NAME) HEAD
	@echo "✓ Created $(ZIP_NAME)"

## Clean generated zip files
clean:
	@echo "Cleaning up zip files..."
ifeq ($(OS),Windows_NT)
	@if exist *.zip del /Q *.zip 2>nul || echo "No zip files to clean"
else
	@rm -f *.zip
endif
	@echo "✓ Cleaned up"

## Show this help message
help:
	@echo Available targets:
	@echo   make zip    - Create a zip file respecting .gitignore
	@echo   make clean  - Remove generated zip files
	@echo   make help   - Show this help message
