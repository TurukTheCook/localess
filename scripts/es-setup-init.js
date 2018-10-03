'use strict';

const AWS = require('aws-sdk');
const elasticsearch = require('elasticsearch');
const config = require('./../config.js');
AWS.config.region = "eu-west-1";
const es = new elasticsearch.Client({
  host: config.esURL,
  connectionClass: require('http-aws-es'),
  amazonES: {
    credentials: new AWS.EnvironmentCredentials('AWS')
  }
});

// TEMPLATE MAPPING
async function esInit () {
  var esTemplate = await es.indices.putTemplate({
    name: "users",
    body: {
      index_patterns: ["users-*"],
      settings: {
        number_of_shards: 1
      },
      mappings: {
        _doc: {
          properties: {
            userId: {
              type: "keyword"
            },
            firstname: {
              type: "text"
            },
            lastname: {
              type: "text"
            },
            createdAt: {
              type: "date",
              format: "epoch_millis"
            }
          }
        }
      }
    }
  });
  console.log('ES templating done..');
  console.log(esTemplate);

  // INDEX CREATION
  var esIndex = await es.indices.create({
    index: 'users-000001'
  });
  console.log('Index created');
  console.log(esIndex);

  // SEARCHING ALIAS CREATION
  var esAliasSearching = await es.indices.putAlias({
    index : "users-*",
    name : "users_search",
    body : {
      filter : { "term" : { "lastname" : "smith" } }
    }
  });
  console.log('Search Alias Created..');
  console.log(esAliasSearching);

  // INDEXING ALIAS CREATION
  var esAliasIndexing = await es.indices.putAlias({
    index : "users-000001",
    name : "users_indexing"
  });
  console.log('Indexing alias created..');
  console.log(esAliasIndexing);

  // ROLLOVER CREATION
  var rollover = await es.indices.rollover({
    alias : "users_indexing",
    body : {
      conditions : {
        max_age : "7d",
        max_docs :  1000,
        max_size :  "5gb"
      }
    }
  });
  console.log('Rollover Created..');
  console.log(rollover);
};
esInit();
