'use strict';

const AWS = require('aws-sdk');
const elasticsearch = require('elasticsearch');
const config = require('../config.js');
const es = new elasticsearch.Client({
  host: config.esURL,
  connectionClass: require('http-aws-es'),
  amazonES: {
    credentials: new AWS.EnvironmentCredentials('AWS')
  }
});

async function indexDelete() {
  var result = await es.indices.delete({
    index: 'users'
  });
  console.log('Index deleted');
  console.log(result);
};
indexDelete();