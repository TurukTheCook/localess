# Serverless DynamoDB + DynamoDB Streams + Nozama Cloudsearch

## Pre-requisites
You need to install elasticsearch 1.7.3 and mongodb, then run it
You'll also need python virtualenv

## Environment setup

```bash
# Setup everything in the directory before launching
npm run init
source nozama/bin/activate
npm run setup

> The command will do this:
> "init": "npm install && virtualenv nozama"
> "setup": "pip install nozama-cloudsearch-service && pip install pymongo==2.7.2"

# In the virtualenv
pserve development.ini

# In another terminal
export AWS_REGION=localhost
sls offline start
```

##  Instructions

```bash
# To add one test user with unique ID and name 'John', lastname 'Doe'
sls invoke local -f PutItem -p './user.json'

# To delete the user you can copy his userId and paste it as data:
sls invoke local -f DeleteItem -d '9522c7c0-bf7a-11e8-a361-c75968a5992c'

# To scan the DDB table
sls invoke local -f Scan

# Try searching for the document:
curl -H "Content-Type: application/json" http://localhost:15808/2013-01-01/search?q=john
curl -H "Content-Type: application/json" http://localhost:15808/2013-01-01/search?q=somethingnotpresent

# Check what documents are present / removed:
curl -H "Content-Type: application/json" http://localhost:15808/dev/documents
> use robo3t or mongo shell to check directly the mongodb

# Empty out all stored content:
curl -X DELETE -H "Content-Type: application/json" http://localhost:15808/dev/documents
```