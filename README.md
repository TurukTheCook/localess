# DDB + DDB-Streams + Elasticsearch

## Scripts
> Before using the script, go to the scripts folder, see the scripts folder readme for more commands..  
```bash
cd scripts
```

## Issues

> Seperating tenants, multiple per index or one per index.  

- Number of shard per index has to be defined before creation, we can later change this with the indices api (shrink/split) but it is not optimal ([shrink](https://www.elastic.co/guide/en/elasticsearch/reference/6.2/indices-shrink-index.html) & [split](https://www.elastic.co/guide/en/elasticsearch/reference/6.2/indices-split-index.html))
- We can use aliases to define new indices for a tenant in case it grows large and separate read/write indices for this tenant (with multiple indices for read and one new index for write operations for example)  


## Documentation

- Basic concepts with definition of index and shards: [here](https://www.elastic.co/guide/en/elasticsearch/reference/current/_basic_concepts.html)  
- Multi-tenants concepts: [here](https://www.elastic.co/fr/blog/found-multi-tenancy)
- Master nodes: [here](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-managedomains-dedicatedmasternodes.html)
- Article about optimizing es, shards per index: [here](https://qbox.io/blog/optimizing-elasticsearch-how-many-shards-per-index)
- Sizing ES blog post: [here](https://www.elastic.co/blog/found-sizing-elasticsearch)
- Sizing ES (AWS documentation): [here](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/sizing-domains.html)
- Alias, pipeline & re-index example (youtube video): [here](https://youtu.be/UxjtEhD3mIY?t=40m)
- Aliases official doc: [here](https://www.elastic.co/guide/en/elasticsearch/reference/6.2/indices-aliases.html)

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