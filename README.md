# DDB + DDB-Streams + Elasticsearch

## Index

1. Documentation  
2. Comparing solution to [this article](https://www.elastic.co/fr/blog/found-multi-tenancy)  
3. Issues  
4. Nomenclature (see ##Issues for details)  
5. How to set everything up 
6. Scripts  

## 1. Documentation  

- Basic concepts with definition of index and shards: [here](https://www.elastic.co/guide/en/elasticsearch/reference/current/_basic_concepts.html)  
- Multi-tenants concepts: [here](https://www.elastic.co/fr/blog/found-multi-tenancy)
- Master nodes: [here](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-managedomains-dedicatedmasternodes.html)
- Article about optimizing es, shards per index: [here](https://qbox.io/blog/optimizing-elasticsearch-how-many-shards-per-index)
- Sizing ES blog post: [here](https://www.elastic.co/blog/found-sizing-elasticsearch)
- Sizing ES (AWS documentation): [here](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/sizing-domains.html)
- Alias, pipeline & re-index example (youtube video): [here](https://youtu.be/UxjtEhD3mIY?t=40m)
- Aliases official doc: [here](https://www.elastic.co/guide/en/elasticsearch/reference/6.2/indices-aliases.html)
- Tips, shard sizing, cluster config (shard per node, number of replica etc.. youtube video): [here](https://www.youtube.com/watch?v=ALa11tIIOCM)  
- How Lucene handles deleted documents and search speed loss: [here](https://www.elastic.co/blog/lucenes-handling-of-deleted-documents)  

`cluster` : An Elasticsearch cluster consists of one or more nodes and is identifiable by its cluster name.  
`node` : A single Elasticsearch instance. In most environments, each node runs on a separate box or virtual machine.  
`index ` : In Elasticsearch, an index is a collection of documents.  
`shard` : Because Elasticsearch is a distributed search engine, an index is usually split into elements known as shards that are distributed across multiple nodes. Elasticsearch automatically manages the arrangement of these shards. It also rebalances the shards as necessary, so users need not worry about the details.  
`replica` : By default, Elasticsearch creates five primary shards and one replica for each index. This means that each index will consist of five primary shards, and each shard will have one copy.  
Allocating multiple shards and replicas is the essence of the design for distributed search capability, providing for high availability and quick access in searches against the documents within an index. The main difference between a primary and a replica shard is that only the primary shard can accept indexing requests. Both replica and primary shards can serve querying requests.

## 2. Comparing solution to [this article](https://www.elastic.co/fr/blog/found-multi-tenancy)

> An important criteria of multi-tenant solutions is to ensure that one tenant is not able to observe any data belonging to another tenant.  

- Context:  
One index per tenant is not a good solution because shards use cpu and memory but if a tenant is too small it is wasted.  
So we go for all tenants with a shared index, but this mean we need a way to keep data separated for each tenant.  

- Solution:  
In the search alias, we separate tenants with their ID in a field:  
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
```

> At this time they discovered that the first time a tenant’s data was accessed, page loads were really slow.  
They realized that this had to do with warming up caches - which was confirmed by testing out cache warmers  

- Solution:  
This problem is not one anymore, as ElasticSearch new versions resolved the issue with cold start. ([source](https://www.elastic.co/guide/en/elasticsearch/reference/6.3/indices-warmers.html))

> They realized, of course, that some tenants are larger than others and wanted to reduce the probability of two large tenants ending up in the same shard and possibly making that shard too large for a single instance. This led them to choose a higher than otherwise necessary number of shards for the indexes.  

- Context:  
If we choose to allocate multiple shards in one index, large tenants can end up in the same shard because of routing.  
To avoid that you can allocate more shards or just go with one shard and monitor its size.  

- Solution:  
We go with one shard and control its size by doing an index-rollover, this API allow to define conditions for an index size  
and when reached, it creates a new index and ajust the alias pointing to the index.  
Of course this is for indexing, so for searching we need to have an alias pointing to the multiple indices created by the rollover API. (see #Issues 1. & 2. for more details)  

> In the long run, it’s a huge benefit for multitenant systems to have independence between shards and tenants. In order to scale well, some tenants need to share a shard and others need multiple shards. By designing your application so that tenants can be moved out to a different index you not only make it possible to add the hardware required for the largest tenants, but you also ensure that the existence of a large tenant does not increase the cost of adding a small tenant.  

- Context:  
Slower search for tiny tenants because their data is spread over multiple large shards,  
might be wise to monitor tenants growth and then decide to separate the big ones on their own indices and let the small tenants on a shared index. 

- Solution:  
To do that we will need to:  
  1. create the new indices + aliases separating the large tenant  
  2. move the old data from these tenants to the new indices  
  3. be sure that the old index will continue to get new data in order to perform a segments merge and hard delete the old data (see below)  
Notes: deleted or updated data is just marked as deleted but still here, it causes longer search (mush be skipped on each search) and reserved storage. ([source](https://www.elastic.co/blog/lucenes-handling-of-deleted-documents)) 

> Avoid putting unrelated data in the same index (from [ES General Recommandations](https://www.elastic.co/guide/en/elasticsearch/reference/6.3/general-recommendations.html)])  
You should avoid putting documents that have totally different structures into the same index in order to avoid sparsity. It is often better to put these documents into different indices, you could also consider giving fewer shards to these smaller indices since they will contain fewer documents overall.  

- Solution:  
We can use one index per document type (users, transactions, etc..) to avoid this problem

## 3. Issues  

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
    "_doc": {
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
}
```  

Links for possible solution:  
  - [Indices Aliases](https://www.elastic.co/guide/en/elasticsearch/reference/6.3/indices-aliases.html)
  - [Indices Rollover](https://www.elastic.co/guide/en/elasticsearch/reference/6.3/indices-rollover-index.html)
  - [Indices Templates](https://www.elastic.co/guide/en/elasticsearch/reference/6.3/indices-templates.html)

## 4. Nomenclature (see ##Issues for details)

- 1 shard and 1 replica per index, shard size 30gb
- If 1 shard and 1 replica per node (instance), this is equivalent to 30*2 * 1.45 = 87gb per data node (see doc: Sizing ES Domain). (AWS ES allows 20 data + 5 master nodes per cluster)
- 2 aliases per tenant per document type (users, transactions, etc..), one for searching, the other for indexing (rolling-index)
- Tenant separation is handled by filtering a field with the tenant id directly via the searching alias

## 5. How to set everything up  

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
const config = require('./../config.js'); //simple config file with aws es domain url
AWS.config.region = "eu-west-1"; //setup the aws region
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
  ```js
  async function esTemplating () {
    var result = await es.indices.putTemplate({
      name: "transactions",
      body: {
        index_patterns: ["transactions-*"],
        settings: {
          number_of_shards: 1
        },
        mappings: {
          _doc: {
            properties: {
              tenant_id: {
                type: "keyword"
              },
              transactions_details: {
                type: "text"
              },*
              createdAt: {
                type: "date",
                format: "epoch_millis"
              }
            }
          }
        }
      }
    });
    console.log('ES templating done.');
    console.log(result);
  };
  esTemplating();
  ```
2. Create first indices for each document type indexing operations: [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-create) 
```js
async function indexCreate() {
  var result = await es.indices.create({
    index: 'transactions-000001'
  });
  console.log('Index created');
  console.log(result);
};
indexCreate();
```
3. Create the two aliases per tenant per document type: [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-putalias)  
  ```js
  // search
  async function aliasSearchCreate() {
    var result = await es.indices.putAlias({
      index : "transactions-*",
      name : "tenant_id_search",
      body : {
        filter : { "term" : { "tenant_id" : "XXXXXXX" } }
      }
    });
    console.log('Search Alias Created');
    console.log(result);
  };
  aliasSearchCreate();

  // indexing
  async function aliasIndexingCreate() {
    var result = await es.indices.putAlias({
      index : "transactions-000001",
      name : "tenant_id_indexing"
    });
    console.log('Indexing alias created');
    console.log(result);
  };
  aliasIndexingCreate();
  ```
One alias for searching and the other for indexing (separate write/read)  
4. Create the index-rollover for each tenant (per document type again): [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-indices-rollover)  
  ```js
  async function rolloverCreate() {
    var result = await es.indices.rollover({
      alias : "tenant_id_indexing",
      body : {
        conditions : {
          max_age : "7d",
          max_docs :  1000,
          max_size :  "5gb"
        }
      }
    });
    console.log('Rollover Created');
    console.log(result);
  };
  rolloverCreate();
  ```

## 6. Scripts  

> Before using the script, go to the scripts folder, see the scripts folder readme for more commands..  
```bash
cd scripts
```