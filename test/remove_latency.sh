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
num_services=${#services[@]}
echo -e "${GREEN}Found running proxy services: ${services[*]}${NC}"


# --- Remove Latency ---

echo "------------------------------------------------------------"
echo -e "${BLUE}Removing latency rules...${NC}"

for (( i=0; i<num_services; i++ )); do
    service=${services[$i]}

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
    echo -e "  ${YELLOW}Attempting to remove latency delay from $service (interface ${interface})${NC}"
    if docker exec "$service" tc qdisc del dev "${interface}" root || true ; then
        echo -e "  ${GREEN}Successfully removed latency for $service (or none existed).${NC}"
    else
        # This else block might not be reached often due to '|| true', but good for explicit errors if || true is removed
        echo -e "  ${RED}Error removing latency for $service.${NC}"
    fi

    echo " "
done

echo -e "${GREEN}Latency rules removed successfully.${NC}"
echo "------------------------------------------------------------"


# --- Verify ---
echo -e "${BLUE}Verifying rules:${NC}"

for (( i=0; i<num_services; i++ )); do
    service=${services[$i]}
    # Re-detect interface for verification in case the loop skipped it due to error
    interface=$(docker exec "$service" ip route show default 2>/dev/null | awk '{print $5}' || echo "")
    if [[ -n "$interface" ]]; then
       echo -e "  ${YELLOW}Verification for $service (interface $interface):${NC}"
       docker exec "$service" tc qdisc show dev "${interface}"
    else
        echo -e "  ${YELLOW}  Skipping verification for $service (could not determine interface).${NC}"
    fi
done


exit 0
