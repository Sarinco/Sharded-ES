#!/bin/bash

# Take the first argument as the ssh machine and forward all the port
SSH_MACHINE=$1

# Forward the port 8080 to 8080
ssh -L 8080:localhost:8080 $SSH_MACHINE

# Forward the frontend
ssh -L 80:localhost:80 $SSH_MACHINE
ssh -L 81:localhost:81 $SSH_MACHINE
