.PHONY : up down stop up-proxy down-proxy up-sites down-sites stop-sites stop-proxy

up: up-sites up-proxy

down: down-sites down-proxy

stop: stop-sites stop-proxy

up-proxy:
	docker compose up -d

down-proxy:
	docker compose down

stop-proxy:
	docker compose stop

up-sites:
	cd site1; docker compose up -d
	cd site2; docker compose up -d
	cd site3; docker compose up -d


down-sites:
	cd site1; docker compose down
	cd site2; docker compose down
	cd site3; docker compose down

stop-sites:
	cd site1; docker compose stop
	cd site2; docker compose stop
	cd site3; docker compose stop
