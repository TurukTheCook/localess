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

async function indexCreate() {
  var result = await es.indices.create({
    index: 'users-000001'
  });
  console.log('Index created');
  console.log(result);
};
indexCreate();