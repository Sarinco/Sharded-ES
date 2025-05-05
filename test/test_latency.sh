#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
# set -e
#

# --- Prerequisites Check ---
if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it (e.g., sudo apt install jq or brew install jq)"
    exit 1
fi
if ! command -v docker &> /dev/null; then
    echo "Error: docker is not installed or not in PATH."
    exit 1
fi
if ! docker compose --version &> /dev/null; then
     echo "Error: docker compose (v2) is not installed or not in PATH."
     exit 1
fi

# --- Configuration ---
PING_COUNT=4 # Number of ping packets to send for each test

# --- Detect Running Proxy Services ---
echo "Detecting running proxy services..."

# Use jq to get service names (requires jq installed on host)
# Filters for services defined in the compose file and currently running
running_services=$(docker ps --filter "status=running" --format json | jq -r 'select(.Names | contains("proxy") or contains("gateway")) | .Names')

if [ -z "$running_services" ]; then
    echo "Error: No running proxy services found (proxy-1, proxy-2, ...)."
    echo "Make sure services are started with 'docker compose up -d'."
    exit 1
fi

# Convert the multi-line string from jq into a bash array
services=($running_services)
num_services=${#services[@]}

# List of the gateway services
gateway_services_raw=$(docker ps --filter "status=running" --format json | jq -r 'select(.Names | contains("gateway")) | .Names')

if [ -z "$gateway_services_raw" ]; then
    echo "Error: No running gateway services found (gateway-1, gateway-2, ...)."
    echo "Make sure services are started with 'docker compose up -d'."
    exit 1
fi

gateway_services=($gateway_services_raw)
num_gateways=${#gateway_services[@]}

echo "Found running services: ${services[*]}"
echo "Testing latency between pairs (${PING_COUNT} pings each)..."
echo "------------------------------------------------------------"

# --- Test Latency Between Pairs ---

# Loop through each service as the source
for (( i=0; i<num_services; i++ )); do
    source_service=${services[$i]}
    echo "Testing latency from ${source_service} to other services..."

    # Loop through subsequent services as the target to avoid duplicates (like proxy-1 -> proxy-2 and proxy-2 -> proxy-1)
    for (( j=0; j<num_services; j++ )); do
        # Skip if the source and target are the same
        if [ $i -eq $j ]; then
            continue
        fi

        target_service=${services[$j]}

        echo -n "  Testing: ${source_service} <--> ${target_service}... "

        ping_output=$(docker exec "$source_service" ping -c "$PING_COUNT" "$target_service" 2>&1)
        exit_status=$?

        if [ $exit_status -eq 0 ]; then
            # Ping successful, parse the average latency
            # Use awk to find the line with min/avg/max and extract the avg value (field 5 when split by '/')
            # Handle potential variations in ping output labels (rtt or round-trip)
             avg_latency=$(echo "$ping_output" | awk -F'[ =/]+' '/rtt|round-trip/ { print $(NF-2) }')

            if [ -n "$avg_latency" ]; then
                echo "Average Latency: ${avg_latency} ms"
            else
                echo "Could not parse latency from ping output."
                # echo "Debug Output: $ping_output" # Uncomment for debugging
            fi
        else
            # Ping failed
            echo "Failed!"
            # Extract the error message (often the last line)
            error_msg=$(echo "$ping_output" | tail -n 1)
            echo "  Error: ${error_msg}"
            # echo "Debug Output: $ping_output" # Uncomment for debugging
        fi
    done
    echo " "
done

echo "------------------------------------------------------------"
echo "Testing latency from the host to the gateway services..."

for (( i=0; i<num_gateways; i++ )); do
    gateway_service=${gateway_services[$i]}

    interface=$(docker exec "$gateway_service" ip route show default 2>/dev/null | awk '{print $5}')
    if [[ -z "$interface" ]]; then
        echo "Error: Could not determine default interface for $gateway_service. Skipping."
        echo "Make sure 'iproute2' package is installed in the container and it has a default route."
        continue
    fi
    # Get the IP address of the gateway service
    gateway_ip=$(docker exec ${gateway_service} ifconfig ${interface} | awk -F ' *|:' '/inet addr/{print $4}')

    if [ -z "$gateway_ip" ]; then
        echo "Error: Could not retrieve IP address for $gateway_service."
        continue
    fi

    echo -n "Testing: Host <--> ${gateway_service} (${gateway_ip})... "

    ping_output=$(ping -c "$PING_COUNT" "$gateway_ip" 2>&1)
    exit_status=$?

    if [ $exit_status -eq 0 ]; then
        # Ping successful, parse the average latency
        avg_latency=$(echo "$ping_output" | awk -F'[ =/]+' '/rtt|round-trip/ { print $(NF-2) }')

        if [ -n "$avg_latency" ]; then
            echo "Average Latency: ${avg_latency} ms"
        else
            echo "Could not parse latency from ping output."
            # echo "Debug Output: $ping_output" # Uncomment for debugging
        fi
    else
        # Ping failed
        echo "Failed!"
        # Extract the error message (often the last line)
        error_msg=$(echo "$ping_output" | tail -n 1)
        echo "  Error: ${error_msg}"
        # echo "Debug Output: $ping_output" # Uncomment for debugging
    fi
done
echo "------------------------------------------------------------"


echo "Latency test complete."

exit 0
