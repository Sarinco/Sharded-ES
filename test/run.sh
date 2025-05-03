#!/bin/bash
# This script is used to run multiple time the npm run test command in the measurer folder

TIMES=${1}
if [ -z "$TIMES" ]; then
  echo "Please provide the number of times to run the test."
  exit 1
fi

# Check if the measurer folder exists
if [ ! -d "measurer" ]; then
  echo "The measurer folder does not exist."
  exit 1
fi

cd measurer || exit

for ((i=1; i<=TIMES; i++)) do
  echo "Running test $i..."
  npm run test
  if [ $? -ne 0 ]; then
    echo "Test $i failed."
    exit 1
  fi
done
