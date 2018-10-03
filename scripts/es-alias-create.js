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

async function aliasSearchCreate() {
  var result = await es.indices.putAlias({
    index : "users-*",
    name : "users_search",
    body : {
      filter : { "term" : { "lastname" : "smith" } }
    }
  });
  console.log('Search Alias Created');
  console.log(result);
};
aliasSearchCreate();

async function aliasIndexingCreate() {
  var result = await es.indices.putAlias({
    index : "users-000001",
    name : "users_indexing"
  });
  console.log('Indexing alias created');
  console.log(result);
};
aliasIndexingCreate();