
if [[ "$#" -ne 4 ]]; then
   echo "This script needs 4 arguments : "
   echo "1: topic"
   echo "2: key"
   echo "3: value"
   echo "4: rule to apply (e.g. {action:shard, region:[region]})"
   echo "Since not enough were given, defaulting to test case 1"
   curl -X POST proxy-1/filter \
      -H "Content-Type: application/json" \
      -d '{"topic": "test", "key": "test", "value": "test", "filter": {"action":"test", "region":["test"]}}'
   exit 0 
fi


curl -X POST proxy-1/filter \
   -H "Content-Type: application/json" \
   -d '{"topic": $1, "key": $2, "value": $3, "filter": $4}'

echo "Filter submitted"