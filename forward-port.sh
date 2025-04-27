#!/bin/bash

# Take the first argument as the ssh machine and forward all the port
SSH_MACHINE=$1

ssh -f -N -L 1080:localhost:80 -L 1081:localhost:81 -L 1082:localhost:8080 "$SSH_MACHINE"

# To kill process
# pkill -f "ssh -f -N -L"

