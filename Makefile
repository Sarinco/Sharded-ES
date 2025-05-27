.PHONY : up down stop up-proxy down-proxy up-sites down-sites stop-sites stop-proxy test clean-tests add-latency remove-latency test-latency test-no-write

NB_TESTS ?= 10

up: up-proxy up-sites 

down: down-proxy down-sites

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
	#cd site3; docker compose up -d


down-sites:
	cd site1; docker compose down
	cd site2; docker compose down
	#cd site3; docker compose down

stop-sites:
	cd site1; docker compose stop
	cd site2; docker compose stop
	#cd site3; docker compose stop

# Use like this:
# make tests NB_TESTS=5 --> will run 5 tests
# or
# make tests --> Will use default value of 10
test:
	@echo "Running tests with $(NB_TESTS) iterations"
	@cd test; cd measurements; mkdir -p $(FOLDER)
	@echo "Running latency test and saving results in measurements/$(FOLDER)/latency.txt"
	@cd test; bash test_latency.sh | tee measurements/$(FOLDER)/latency.txt
	@cd test; bash run.sh $(NB_TESTS)

test-no-write:
	@echo "Running tests with $(NB_TESTS) iterations"
	@cd test; bash run.sh $(NB_TESTS)

clean-tests:
	@echo "Cleaning up test results in measurements/$(FOLDER)"
	rm test/measurements/$(FOLDER)/*.json

add-latency:
	@bash test/add_latency.sh

remove-latency:
	@bash test/remove_latency.sh

test-latency:
	@bash test/test_latency.sh
