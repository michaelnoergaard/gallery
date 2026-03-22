.PHONY: dev-backend dev-frontend build test

dev-backend:
	cd cmd/gallery && go run .

dev-frontend:
	cd web && npm run dev

build:
	docker compose build

test:
	go test ./...
