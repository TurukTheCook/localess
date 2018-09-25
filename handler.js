'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const elasticsearch = require('elasticsearch');

const dd = new AWS.DynamoDB.DocumentClient();
const es = new elasticsearch.Client({
  host: 'https://search-ddb-streams-es-4xrzlieuxfr4xuvrcuvnv7imuq.eu-west-1.es.amazonaws.com',
  connectionClass: require('http-aws-es'),
  amazonES: {
    credentials: new AWS.EnvironmentCredentials('AWS')
  }
});
const TABLE_NAME = "UsersTable";

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
        callback(null, {
          statusCode: err.statusCode || 500,
          message: 'Could not add user to ddb..',
          body: err
        });
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
      callback(null, {
        statusCode: err.statusCode || 500,
        message: 'Could not delete user from ddb..',
        body: err
      });
    });
};

module.exports.Scan = (event, context, callback) => {
  dd.scan({TableName: TABLE_NAME}).promise()
    .then(res => {
      callback(null, res);
    })
    .catch(err => {
      callback(null, {
        statusCode: err.statusCode || 500,
        message: 'Could not scan ddb..',
        body: err
      });
    });
};

/**
 * DYNAMODB-STREAMS AND ELASTICSEARCH
 */
 
module.exports.triggerStream = (event, context, callback) => {
  let record = event.Records[0];
  let data = {id : record.dynamodb.Keys.userId.S};
  let image = record.dynamodb.NewImage;
  let params = {
    index: 'users',
    type: 'user',
    id: data.id
  };
  if (record.eventName === 'REMOVE') {
    es.delete(params)
      .then(res => {
        callback(null, res);
      })
      .catch(err => {
        callback(null, {
          statusCode: err.statusCode || 500,
          message: 'Could not remove item from ES..',
          body: err
        });
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
        callback(null, {
          statusCode: err.statusCode || 500,
          message: 'Could not add item to ES..',
          body: err
        });
      });
  }
};

module.exports.Search = (event, context, callback) => {
  let params = {
    q: event.q,
    size: event.size,
    from: event.from,
  };
  es.search(params)
    .then(res => {
      callback(null, res);
    })
    .catch(err => {
      callback(null, {
        statusCode: err.statusCode || 500,
        message: 'Could not add item to ES..',
        body: err
      });
    });
};

// module.exports.PingEs = (event, context, callback) => {
//   es.ping({
//     requestTimeout: 30000,
//     }, err => {
//       if (err) {
//         console.error('elasticsearch cluster is down!');
//       } else {
//         console.log('All is well');
//       }
//   });
// };