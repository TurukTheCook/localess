'use strict';

const AWS = require('aws-sdk');
const elasticsearch = require('elasticsearch');
const config = require('../config.js');
AWS.config.region = "eu-west-1";
const es = new elasticsearch.Client({
  host: config.esURL,
  connectionClass: require('http-aws-es'),
  amazonES: {
    credentials: new AWS.EnvironmentCredentials('AWS')
  }
});

// GET THE TEMPLATE
async function esGetTemplate () {
  var result = await es.indices.getTemplate({
    name: "users"
  });
  console.log('ES getting template done.');
  console.log(JSON.stringify(result));
};
esGetTemplate();