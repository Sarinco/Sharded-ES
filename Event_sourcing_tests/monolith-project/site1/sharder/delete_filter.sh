
if [[ "$#" -ne 3 ]]; then
   echo "This script needs 3 arguments : "
   echo "1: topic"
   echo "2: key"
   echo "3: value"
   echo "Since not enough were given, defaulting to test case 1"
   curl -X DELETE proxy-1/filter \
      -H "Content-Type: application/json" \
      -d '{"topic": "test", "key": "test", "value": "test"}'
   exit 0 
fi


curl -X POST proxy-1/filter \
   -H "Content-Type: application/json" \
   -d '{"topic": $1, "key": $2, "value": $3}'

echo "Filter submitted"