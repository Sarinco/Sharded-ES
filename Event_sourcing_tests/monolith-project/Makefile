.PHONY : up down up-proxy down-proxy up-sites down-sites

up: up-sites up-proxy

down: down-sites down-proxy

up-proxy:
	docker compose up -d

down-proxy:
	docker compose down

up-sites:
	cd site1; docker compose up -d
	cd site2; docker compose up -d
	cd site3; docker compose up -d


down-sites:
	cd site1; docker compose down
	cd site2; docker compose down
	cd site3; docker compose down
