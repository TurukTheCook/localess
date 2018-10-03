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

async function rolloverCreate() {
  var result = await es.indices.rollover({
    alias : "users_indexing",
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


