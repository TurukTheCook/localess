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

// DELETE THE TEMPLATE
async function esDeleteTemplate () {
  var result = await es.indices.deleteTemplate({
    name: "users"
  });
  console.log('ES deleting template done.');
  console.log(JSON.stringify(result));
};
esDeleteTemplate();