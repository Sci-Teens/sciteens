.DEFAULT_GOAL := help
.PHONY: help install dev build start lint format format-fix \
	test test-unit test-watch test-rules test-e2e test-e2e-ui clean

help:
	@echo "install       install dependencies (frozen lockfile)"
	@echo "dev           start the dev server on :3000"
	@echo "build         next build + sitemap"
	@echo "start         start the production server"
	@echo "lint          next lint"
	@echo "format        check formatting (prettier --check)"
	@echo "format-fix    apply formatting (prettier --write)"
	@echo "test          unit + firestore rules tests"
	@echo "test-unit     vitest unit/component tests"
	@echo "test-watch    vitest in watch mode"
	@echo "test-rules    firestore rules tests (needs JDK 21, firebase emulator)"
	@echo "test-e2e      playwright end-to-end tests"
	@echo "test-e2e-ui   playwright end-to-end tests, interactive UI"
	@echo "clean         remove build artifacts and caches"

install:
	corepack pnpm install --frozen-lockfile

dev:
	corepack pnpm dev

build:
	corepack pnpm build

start:
	corepack pnpm start

lint:
	corepack pnpm lint

format:
	corepack pnpm format

format-fix:
	corepack pnpm format:fix

test: test-unit test-rules

test-unit:
	corepack pnpm test:unit

test-watch:
	corepack pnpm test:watch

test-rules:
	corepack pnpm test:rules

test-e2e:
	corepack pnpm test:e2e

test-e2e-ui:
	corepack pnpm test:e2e:ui

clean:
	rm -rf .next out node_modules/.cache
