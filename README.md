# DDB + DDB-Streams + Elasticsearch

## Scripts
> Before using the script, go to the scripts folder  
```bash
cd scripts
```

- ## DDB Seeder
```bash
node ddb-seeder.js
```

- ## Elasticsearch

> ES create index  
```bash
node es-create-index.js
```
  
> ES delete index  
```bash
node es-delete-index.js
```
  
> ES index mapping  

Before indexing data you'll need to define the fields type by [mapping the index](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html)  
Else [Dynamic Mapping](https://www.elastic.co/guide/en/elasticsearch/reference/current/dynamic-mapping.html) will take place, you still have to activate numeric detection to detect differents numeric types.  
You can't delete a mapping, you'll have to delete/create again the index in order to map it. ([source](https://www.elastic.co/guide/en/elasticsearch/reference/6.2/indices-delete-mapping.html))
```bash
node es-mapping.js
```
