# DDB + DDB-Streams + Elasticsearch

## Nomenclature (see Issues for details)

- 1 shard and 1 replica per index, shard size 30gb
- If 1 shard and 1 replica per node (instance), this is equivalent to 30*2 * 1.45 = 87gb per data node (see doc: Sizing ES Domain). (AWS ES allows 20 data + 5 master nodes per cluster)
- 2 aliases per tenant per document type (users, transactions, etc..), one for searching, the other for indexing (rolling-index)
- Tenant separation is handled by filtering a field with the tenant id directly via the searching alias

## How to set everything up  

See ## Issues for more informations as why  
See [here](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/aes-supported-es-operations.html) for aws es supported operations

> Create an ES Domain (cluster) on AWS ([documentation](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-createupdatedomains.html))

It can be done with AWS SDK awsell: [link](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ES.html)

> For further OPs you can use elasticsearch js client (see [API](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html))

Init should looks like something like this:
```js
'use strict';

const AWS = require('aws-sdk');
const elasticsearch = require('elasticsearch'); //elasticsearch javascript client
const config = require('../config.js'); //simple config file with aws es domain url
const es = new elasticsearch.Client({
  host: config.esURL,
  connectionClass: require('http-aws-es'), //allow signed requests to aws
  amazonES: {
    credentials: new AWS.EnvironmentCredentials('AWS')
  }
});
```
And an async operation like this:
```js
async function esMap () {
  var result = await es.indices.putMapping({
    index: 'users',
    type: '_doc',
    body: {
      properties: {
        createdAt: { type: 'date', format: 'epoch_millis' },
        firstname: { type: 'text' },
        lastname: { type: 'text' }
      }
    }
  });
  console.log('ES Mapping done.');
  console.log(result);
};
esMap();
```

So the steps to set it up:  
1. Define a template for mapping indices for each type of document: [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-puttemplate)
The body should looks like this:
```json
"body": {
  "index_patterns": ["transactions-*"],
  "settings": {
    "number_of_shards": 1
  },
  "mappings": {
    "properties": {
      "tenant_id": {
        "type": "keyword"
      },
      "transactions_details": {
        "type": "text"
      },
      "created_at": {
        "type": "date",
        "format": "epoch_millis"
      }
    }
  }
}
```
2. Create first indices for each document type indexing operations: [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-create)
3. Create the two aliases per tenant per document type: [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-putalias)  
One alias for searching and the other for indexing (separate write/read)
4. Create the index-rollover for each tenant (per document type again): [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-rollover)

## Issues

> Seperating tenants, multiple per index or one per index.  

- Number of shard per index has to be defined before creation, we can later change this with the indices api (shrink/split) but it is not optimal ([shrink](https://www.elastic.co/guide/en/elasticsearch/reference/6.3/indices-shrink-index.html) & [split](https://www.elastic.co/guide/en/elasticsearch/reference/6.3/indices-split-index.html))
- We can use aliases to define new indices for a tenant in case it grows large and separate read/write indices for this tenant (with multiple indices for read and one new index for write operations for example)  

> Possible Solution  

Put all tenants in one index per document type (users, transactions, etc) with one shard + one replica each  
filter them with a field tenant_id directly on the search aliases.  
Handle growth by creating one searching alias per tenant per document type which cover multiple indices  
and a rolling-index for indexing, which generate new indices automatically if size of a shard is too much.

1. Create two aliases per tenant, one for searching, the other for indexing:
```json
POST /_aliases
{
    "actions" : [
        {
            "add" : {
                 "index" : "transactions-*",
                 "alias" : "tenant_id_search",
                 "filter" : { "term" : { "tenant_id" : "XXXXXXX" } }
            }
        }
    ]
}
POST /_aliases
{
    "actions" : [
        { "add" : { "index" : "transactions-000001", "alias" : "tenant_id_indexing" } }
    ]
}  
```  

2. Then do an index-rollover to create new write indexes:
```json
POST /tenant_id_indexing/_rollover 
{
  "conditions": {
    "max_age":   "7d",
    "max_docs":  1000,
    "max_size":  "5gb"
  }
}
```  

If the index pointed to by tenant_id_indexing was created 7 or more days ago, or contains 1,000 or more documents, or has an index size at least around 5GB, then the transactions-000002 index is created and the tenant_id_indexing alias is updated to point to transactions-000002.  

If the name of the existing index ends with - and a number — e.g. logs-000001 — then the name of the new index will follow the same pattern, incrementing the number (logs-000002). The number is zero-padded with a length of 6, regardless of the old index name.  

3. Define an index template for the new indices created automatically
```json
PUT _template/template_1
{
  "index_patterns": ["transactions-*"],
  "settings": {
    "number_of_shards": 1
  },
  "mappings": {
    "properties": {
      "tenant_id": {
        "type": "keyword"
      },
      "transactions_details": {
        "type": "text"
      },
      "created_at": {
        "type": "date",
        "format": "epoch_millis"
      }
    }
  }
}
```  

Links for possible solution:  
  - [Indices Aliases](https://www.elastic.co/guide/en/elasticsearch/reference/6.3/indices-aliases.html)
  - [Indices Rollover](https://www.elastic.co/guide/en/elasticsearch/reference/6.3/indices-rollover-index.html)
  - [Indices Templates](https://www.elastic.co/guide/en/elasticsearch/reference/6.3/indices-templates.html)

> Possible New Issue (?)  

Slower search for tiny tenants because their data is spread over multiple large shards,  
might be wise to monitor tenants growth and then decide to separate the big ones on their own indices and let the small tenants on a shared index. 

To do that we will need to:
- create the new indices + aliases separating the large tenant
- move the old data from these tenants to the new indices
- be sure that the old index will continue to get new data in order to perform a segments merge and hard delete the old data (see below)

Notes: deleted or updated data is just marked as deleted but still here, it causes longer search (mush be skipped on each search)  
and reserved storage.

## Documentation

- Basic concepts with definition of index and shards: [here](https://www.elastic.co/guide/en/elasticsearch/reference/current/_basic_concepts.html)  
- Multi-tenants concepts: [here](https://www.elastic.co/fr/blog/found-multi-tenancy)
- Master nodes: [here](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-managedomains-dedicatedmasternodes.html)
- Article about optimizing es, shards per index: [here](https://qbox.io/blog/optimizing-elasticsearch-how-many-shards-per-index)
- Sizing ES blog post: [here](https://www.elastic.co/blog/found-sizing-elasticsearch)
- Sizing ES (AWS documentation): [here](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/sizing-domains.html)
- Alias, pipeline & re-index example (youtube video): [here](https://youtu.be/UxjtEhD3mIY?t=40m)
- Aliases official doc: [here](https://www.elastic.co/guide/en/elasticsearch/reference/6.2/indices-aliases.html)
- Tips, shard sizing, cluster config (shard per node, number of replica etc.. youtube video): [here](https://www.youtube.com/watch?v=ALa11tIIOCM)

> cluster  

An Elasticsearch cluster consists of one or more nodes and is identifiable by its cluster name.

> node  

A single Elasticsearch instance. In most environments, each node runs on a separate box or virtual machine.

> index  

In Elasticsearch, an index is a collection of documents.

> shard  

Because Elasticsearch is a distributed search engine, an index is usually split into elements known as shards that are distributed across multiple nodes. Elasticsearch automatically manages the arrangement of these shards. It also rebalances the shards as necessary, so users need not worry about the details.

> replica  

By default, Elasticsearch creates five primary shards and one replica for each index. This means that each index will consist of five primary shards, and each shard will have one copy.

Allocating multiple shards and replicas is the essence of the design for distributed search capability, providing for high availability and quick access in searches against the documents within an index. The main difference between a primary and a replica shard is that only the primary shard can accept indexing requests. Both replica and primary shards can serve querying requests.

## Scripts
> Before using the script, go to the scripts folder, see the scripts folder readme for more commands..  
```bash
cd scripts
```