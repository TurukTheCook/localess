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

async function aliasGet() {
  var result = await es.indices.getAlias({
    name : "users_search, users_indexing",
  });
  console.log('Searching for aliases..');
  console.log(JSON.stringify(result));
};
aliasGet();