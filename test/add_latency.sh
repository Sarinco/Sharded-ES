#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color - resets the text color


# --- Prerequisites Check ---
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed. Please install it (e.g., sudo apt install jq or brew install jq)${NC}"
    exit 1
fi
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed or not in PATH.${NC}"
    exit 1
fi
if ! docker compose --version &> /dev/null; then
     echo -e "${RED}Error: docker compose (v2) is not installed or not in PATH.${NC}"
     exit 1
fi

# --- Detect Running Proxy Services ---
echo -e "${BLUE}Detecting running proxy services...${NC}"
running_services=$(docker ps --filter "status=running" --format json | jq -r 'select(.Names | contains("proxy") or contains("gateway")) | .Names')
if [ -z "$running_services" ]; then
    echo -e "${RED}Error: No running proxy services found (proxy-1, proxy-2, ...).${NC}"
    echo -e "${YELLOW}Make sure services are started with 'docker compose up -d'.${NC}"
    exit 1
fi
# Convert the multi-line string from jq into a bash array
services=($running_services)
IFS=$'\n' services=($(sort <<<"${services[*]}")); unset IFS
echo -e "${GREEN}Found running proxy services: ${services[*]}${NC}"

# --- Configuration ---
# Define latency values (in milliseconds) for egress traffic from each proxy.
LATENCIES=(
    # Latency on the interface for all the communication comming from the proxy network
    "site1-gateway-1:15ms"

    "site2-gateway-1:20ms"

)

# --- Apply Latency ---
echo "------------------------------------------------------------"
echo -e "${BLUE}Applying latency rules...${NC}"

# Loop through the defined latencies
for entry in "${LATENCIES[@]}"; do
    # Split "service:latency"
    IFS=":" read -r service latency_val <<< "$entry"
    echo -e "${YELLOW}Processing $service with latency $latency_val...${NC}"

    # Check if the service is running
    #if ! docker ps --filter "status=running" --format json | jq -e 'select(.Names == "'"$service"'")' &> /dev/null; then
    #    echo -e "  ${RED}Error: $service is not running. Skipping.${NC}"
    #    continue
    #fi

    # Dynamically find the default interface inside the container
    echo -e "  ${YELLOW}Detecting default interface for $service...${NC}"
    interface=$(docker exec "$service" ip route show default 2>/dev/null | awk '{print $5}' || echo "")

    if [[ -z "$interface" ]]; then
        echo -e "  ${RED}Error: Could not determine default interface for $service. Skipping.${NC}"
        echo -e "  ${YELLOW}Make sure 'iproute2' package is installed in the container and it has a default route.${NC}"
        continue
    fi
    echo -e "  ${GREEN}Detected interface: $interface for $service${NC}"

    # Apply the latency rule using the detected interface
    echo -e "  ${YELLOW}Adding ${latency_val} delay to $service (interface ${interface})${NC}"
    if docker exec "$service" tc qdisc add dev "${interface}" root netem delay "${latency_val}"; then
        echo -e "  ${GREEN}Successfully applied latency to $service.${NC}"
    else
        echo -e "  ${YELLOW}Error applying latency to $service. It might already have a qdisc. Try removing rules first.${NC}"
        echo -e "  ${YELLOW}Attempting to replace existing qdisc with new latency value...${NC}"
        docker exec "$service" tc qdisc replace dev "${interface}" root netem delay "${latency_val}"
        if [ $? -eq 0 ]; then
            echo -e "  ${GREEN}Successfully replaced existing qdisc with new latency value for $service.${NC}"
        else
            echo -e "  ${RED}Error: Failed to replace existing qdisc for $service. Please check manually.${NC}"
            exit 1
        fi
    fi

    echo " "
done

echo -e "${GREEN}Latency rules applied successfully.${NC}"
echo "------------------------------------------------------------"
echo " "

# --- Verify ---
echo -e "${BLUE}Verifying rules:${NC}"

for entry in "${LATENCIES[@]}"; do
    IFS=":" read -r service _ <<< "$entry"
#
    interface=$(docker exec "$service" ip route show default 2>/dev/null | awk '{print $5}' || echo "")
    if [[ -n "$interface" ]]; then
       echo -e "${YELLOW}  Verification for $service (interface $interface):${NC}"
       docker exec "$service" tc qdisc show dev "${interface}"
    else
        echo -e "  ${YELLOW}Skipping verification for $service (could not determine interface).${NC}"
    fi
done

exit 0
