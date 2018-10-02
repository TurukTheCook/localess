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

async function esMap () {
  var result = await es.indices.putMapping({
    index: 'users',
    type: '_doc',
    body: {
      properties: {
        createdAt: { type: 'date', format: 'epoch_millis' },
        firstname: { type: 'text' },
        lastname: { type: 'text' }
      }
    }
  });
  console.log('ES Mapping done.');
  console.log(result);
};
esMap();

