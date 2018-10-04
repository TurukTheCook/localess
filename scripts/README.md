- ## DDB Seeder
```bash
node ddb-seeder.js
```

- ## Elasticsearch

> ES templating actions

- Before indexing data you'll need to define the fields type by [mapping the index](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html)  
Else [Dynamic Mapping](https://www.elastic.co/guide/en/elasticsearch/reference/current/dynamic-mapping.html) will take place, you still have to activate numeric detection to detect differents numeric types.  
- You can't delete a mapping, you'll have to delete/create again the index in order to map it, this is called re-indexing. ([source](https://www.elastic.co/guide/en/elasticsearch/reference/6.2/indices-delete-mapping.html))

```bash
node es-template-create.js  

node es-template-get.js  

node es-template-delete.js
```

> ES indices actions
```bash
node es-index-create.js  

node es-index-delete.js
```

> ES aliases actions
```bash
node es-alias-create.js  

node es-alias-get.js  
```

> Initial test setup
```bash
node es-setup-init.js
```