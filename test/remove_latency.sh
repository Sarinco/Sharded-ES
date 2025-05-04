#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

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

# --- Detect Running Proxy Services ---
running_services=$(docker compose ps --filter "status=running" --format json | jq -r 'select(.Service | contains("proxy")) | .Service')
if [ -z "$running_services" ]; then
    echo "Error: No running proxy services found (proxy-1, proxy-2, ...)."
    echo "Make sure services are started with 'docker compose up -d'."
    exit 1
fi
# Convert the multi-line string from jq into a bash array
services=($running_services)
num_services=${#services[@]}
echo "Found running proxy services: ${services[*]}" 


# --- Remove Latency ---
echo "Removing latency rules..."

for (( i=0; i<num_services; i++ )); do
    service=${services[$i]}

    # Dynamically find the default interface inside the container
    echo "  Detecting default interface for $service..."
    interface=$(docker compose exec "$service" ip route show default 2>/dev/null | awk '{print $5}' || echo "")

    if [[ -z "$interface" ]]; then
        echo "  Error: Could not determine default interface for $service. Skipping."
        echo "  Make sure 'iproute2' package is installed in the container and it has a default route."
        continue
    fi
    echo "  Detected interface: $interface for $service"

    # Apply the latency rule using the detected interface
    if docker compose exec "$service" tc qdisc del dev "${interface}" root || true ; then
        echo "  Successfully removed latency to $service."
    else
        echo "  Error removing latency to $service."
    fi

    echo " "
done

echo "Latency rules removed successfully."

# --- Verify ---
echo "Verifying rules:"

for (( i=0; i<num_services; i++ )); do
    service=${services[$i]}
    # Re-detect interface for verification in case the loop skipped it due to error
    interface=$(docker compose exec "$service" ip route show default 2>/dev/null | awk '{print $5}' || echo "")
    if [[ -n "$interface" ]]; then
       echo "  Verification for $service (interface $interface):"
       docker compose exec "$service" tc qdisc show dev "${interface}"
    else
        echo "  Skipping verification for $service (could not determine interface)."
    fi
done


exit 0
