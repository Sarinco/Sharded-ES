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
echo "Found running proxy services: ${services[*]}" 

# --- Configuration ---
# Define latency values (in milliseconds) for egress traffic from each proxy.
LATENCIES=(
    "proxy-1:30ms"
    "proxy-2:50ms"
    "proxy-3:20ms"
    # Add more services and latencies here if needed
)

# --- Apply Latency ---
echo "------------------------------------------------------------"
echo "Applying latency rules..."

# Loop through the defined latencies
for entry in "${LATENCIES[@]}"; do
    # Split "service:latency"
    IFS=":" read -r service latency_val <<< "$entry"
    echo "Processing $service with latency $latency_val..."

    # Check if the service is running
    if ! docker compose ps --filter "status=running" --format json | jq -e 'select(.Service == "'"$service"'")' &> /dev/null; then
        echo "  Error: $service is not running. Skipping."
        continue
    fi

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
    echo "  Adding ${latency_val} delay to $service (interface ${interface})"
    if docker compose exec "$service" tc qdisc add dev "${interface}" root netem delay "${latency_val}"; then
        echo "  Successfully applied latency to $service."
    else
        echo "  Error applying latency to $service. It might already have a qdisc. Try removing rules first."
        echo "  Attempting to replace existing qdisc with new latency value..."
        docker compose exec "$service" tc qdisc replace dev "${interface}" root netem delay "${latency_val}"
        if [ $? -eq 0 ]; then
            echo "  Successfully replaced existing qdisc with new latency value for $service."
        else
            echo "  Error: Failed to replace existing qdisc for $service. Please check manually."
            exit 1
        fi
    fi

    echo " "
done

echo "Latency rules applied successfully."
echo "------------------------------------------------------------"
echo " "

# --- Verify ---
echo "Verifying rules:"

for entry in "${LATENCIES[@]}"; do
    IFS=":" read -r service _ <<< "$entry"

    interface=$(docker compose exec "$service" ip route show default 2>/dev/null | awk '{print $5}' || echo "")
    if [[ -n "$interface" ]]; then
       echo "  Verification for $service (interface $interface):"
       docker compose exec "$service" tc qdisc show dev "${interface}"
    else
        echo "  Skipping verification for $service (could not determine interface)."
    fi
done

exit 0
