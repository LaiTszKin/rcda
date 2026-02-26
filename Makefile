.PHONY: run stop restart update build

run:
	docker compose up -d

stop:
	docker compose down

restart:
	docker compose down && docker compose up -d

update:
	git pull && bash scripts/update_env.sh && docker compose build

build:
	docker compose build --no-cache
