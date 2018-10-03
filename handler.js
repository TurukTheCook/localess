'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const elasticsearch = require('elasticsearch');
const config = require('./config.js');
AWS.config.region = "eu-west-1";
const dd = new AWS.DynamoDB.DocumentClient();
const es = new elasticsearch.Client({
  host: config.esURL,
  connectionClass: require('http-aws-es'),
  amazonES: {
    credentials: new AWS.EnvironmentCredentials('AWS')
  }
});
const TABLE_NAME = "UsersTable";

/**
 * DYNAMODB FUNCTIONS
 */

function createRes (statusCode, message) {
  return {
    statusCode: statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(message)
  };
};

function createErr (statusCode, message) {
  return {
    statusCode: statusCode || 500,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(message)
  };
};

module.exports.PutItem = (event, context, callback) => {
  let user = JSON.parse(event.body);
  let newDate = new Date().getTime();
  let params = {
    TableName: TABLE_NAME,
    Item: {
      userId: uuid.v1(),
      firstname: user.firstname,
      lastname: user.lastname,
      createdAt: newDate,
    }
  };
  dd.put(params).promise()
    .then(res => {
      callback(null, createRes(200, params.Item));
    })
    .catch(err => {
      callback(null, createErr(err.statusCode, err));
    });
};

module.exports.DeleteItem = (event, context, callback) => {
  let userId = event.pathParameters.userId;
  let params = {
    TableName: TABLE_NAME,
    Key: {
      userId: userId
    }
  };
  dd.delete(params).promise()
    .then(res => {
      callback(null, createRes(200, {message: 'User with id: ' + params.Key.userId + ' was deleted successfully'}));
    })
    .catch(err => {
      callback(null, createErr(err.statusCode, err));
    });
};

module.exports.UpdateItem = (event, context, callback) => {
  let userId = event.pathParameters.userId;
  let body = JSON.parse(event.body);
  let params = {
    TableName: TABLE_NAME,
    Key: {
      userId: userId
    },
    UpdateExpression: 'set ' + body.paramName + ' = :v',
    ExpressionAttributeValues: {
      ':v': body.paramValue
    },
    ReturnValues: 'NONE'
  };
  dd.update(params).promise()
    .then(res => {
      callback(null, createRes(200, {message: 'User with id: ' + params.Key.userId + ' was updated successfully'}));
    })
    .catch(err => {
      callback(null, createErr(err.statusCode, err));
    });
};

module.exports.Scan = (event, context, callback) => {
  dd.scan({TableName: TABLE_NAME}).promise()
    .then(res => {
      callback(null, createRes(200, res));
    })
    .catch(err => {
      callback(null, createErr(err.statusCode, err));
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
    index: 'users_indexing',
    type: '_doc',
    id: data.id,
  };
  if (record.eventName === 'REMOVE') {
    es.delete(params)
      .then(res => {
        callback(null, createRes(200, res));
      })
      .catch(err => {
        callback(null, createErr(err.statusCode, err));
      });
  } else if (record.eventName === 'MODIFY') {
    params.body = {
      doc: {}
    };
    for (let key of Object.keys(image)) {
      params.body.doc[key] = image[key].S;
    };
    params.body.doc.userId = undefined
    es.update(params)
      .then(res => {
        callback(null, createRes(200, res));
      })
      .catch(err => {
        callback(null, createErr(err.statusCode, err));
      });
  } else {
    params.body = {
      firstname: image.firstname.S,
      lastname: image.lastname.S,
      userId: data.id,
      createdAt: image.createdAt.N,
    };
    es.create(params)
      .then(res => {
        callback(null, createRes(200, res));
      })
      .catch(err => {
        callback(null, createErr(err.statusCode, err));
      });
  }
};

module.exports.Search = (event, context, callback) => {
  let queryArray = event.queryStringParameters.q.split(" ");
  let qq = '';
  for (let i = 0; i < queryArray.length; i++) {
    qq += '*'
    qq += queryArray[i];
    qq += '*';
    qq += ' ';
  };
  qq.trim();
  if (!queryArray[0]) qq = '*';

  let params = {
    index: "users_search",
    body: {
      query: {
        bool: {
          must: {
            query_string : {
              query : qq,
              default_field: '*'
              // fields : ["firstname", "lastname"] 
            }
          },
          // filter: {
          //   term: {
          //     lastname: "smith"
          //   }
          // }
        }
      },
      size: event.queryStringParameters.size || 100,
      from: event.queryStringParameters.from || 0,
      sort: event.queryStringParameters.sort || { "createdAt" : "desc" },
    }
  };

  es.search(params)
    .then(res => {
      callback(null, createRes(200, res));
    })
    .catch(err => {
      callback(null, createErr(err.statusCode, err));
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