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

// SIMPLE INDEX MAPPING
// async function esMap () {
//   var result = await es.indices.putMapping({
//     index: 'users',
//     type: '_doc',
//     body: {
//       properties: {
//         createdAt: { type: 'date', format: 'epoch_millis' },
//         firstname: { type: 'text' },
//         lastname: { type: 'text' }
//       }
//     }
//   });
//   console.log('ES Mapping done.');
//   console.log(result);
// };
// esMap();

// TEMPLATE MAPPING
async function esTemplating () {
  var result = await es.indices.putTemplate({
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
  console.log('ES templating done.');
  console.log(result);
};
esTemplating();
