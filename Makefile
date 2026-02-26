.PHONY: run stop restart update build

run:
	docker compose up -d && npm run dev:desktop

stop:
	docker compose down

restart:
	docker compose down && docker compose up -d && npm run dev:desktop

update:
	git pull && docker compose build

build:
	docker compose build --no-cache
