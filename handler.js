'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const elasticsearch = require('elasticsearch');
const dd = new AWS.DynamoDB.DocumentClient({
  region: 'localhost',
  endpoint: 'http://localhost:8000'
});
const es = new elasticsearch.Client({
  host: 'localhost:4571',
  // log: 'trace'
});
const TABLE_NAME = "usersTable";

/**
 * DYNAMODB FUNCTIONS
 */

module.exports.PutItem = (event, context, callback) => {
    let params = {
      TableName: TABLE_NAME,
      Item: {
        userId: uuid.v1(),
        name: event.name,
        lastname: event.lastname
      }
    };

    dd.put(params).promise()
      .then(result => {
        let response = {
          statusCode: 200,
          body: params.Item
        };
        callback(null, response);
      })
      .catch(error => {
        console.error(error);
        callback(null, "Couldn't add user to ddb..");
      });
};

module.exports.DeleteItem = (event, context, callback) => {
  let params = {
    TableName: TABLE_NAME,
    Key: {
      userId: event
    }
  };

  dd.delete(params).promise()
    .then(result => {
      let response = {
        statusCode: 200,
        message: 'User with id: ' + params.Key.userId + ' deleted successfully'
      };
      callback(null, response);
    })
    .catch(error => {
      console.log(error);
      callback(null, "Couldn't delete user from ddb..");
    });
};

module.exports.Scan = (event, context, callback) => {
  dd.scan({TableName: TABLE_NAME}).promise()
    .then(res => {
      callback(null, res);
    })
    .catch(err => {
      console.error(err);
      callback(null, "Could'nt scan ddb..");
    });
};

/**
 * DYNAMODB-STREAMS AND ELASTICSEARCH
 */
 
module.exports.triggerStream = (event, context, callback) => {
  console.log('DDB Stream Triggered..')
  
  let record = event.Records[0];
  let data = {id : record.dynamodb.Keys.userId.S};
  let image = record.dynamodb.NewImage;
  let params = {
    index: 'users',
    type: 'user',
    id: data.id
  };

  // Delete record deleted from DynamoDB or fill data fields
  if (record.eventName === 'REMOVE') {
    es.delete(params)
      .then(res => {
        callback(null, res);
      })
      .catch(err => {
        console.error(err);
        callback(null, 'Could not remove item from ES..');
      });
  } else {
    params.body = {
      name: image.name.S,
      lastname: image.lastname.S, 
    };
    es.create(params)
      .then(res => {
        callback(null, res);
      })
      .catch(err => {
        console.error(err);
        callback(null, 'Could not add item to ES..');
      });
  }
};

module.exports.Search = (event, context, callback) => {
  let data = JSON.parse(JSON.stringify(event));
  let params = {
    q: data.q,
    size: data.size,
    from: data.from,
  };
  console.log(params);

  es.search(params)
    .then(res => {
      callback(null, res);
    })
    .catch(err => {
      callback(null, err);
    });
};

module.exports.PingEs = (event, context, callback) => {
  es.ping({
    requestTimeout: 30000,
    }, err => {
      if (err) {
        console.error('elasticsearch cluster is down!');
      } else {
        console.log('All is well');
      }
  });
};