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
  let user = JSON.parse(event.body);
  let params = {
    TableName: TABLE_NAME,
    Item: {
      userId: uuid.v1(),
      name: user.name,
      lastname: user.lastname
    }
  };
  dd.put(params).promise()
    .then(res => {
      let response = {
        statusCode: 200,
        body: JSON.stringify(params.Item)
      };
      callback(null, response);
    })
    .catch(err => {
      callback(null, {
        statusCode: err.statusCode || 500,
        body: JSON.stringify(err)
      });
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
      let response = {
        statusCode: 200,
        body: JSON.stringify({message: 'User with id: ' + params.Key.userId + ' was deleted successfully'})
      };
      callback(null, response);
    })
    .catch(err => {
      callback(null, {
        statusCode: err.statusCode || 500,
        body: JSON.stringify(err)
      });
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
      let response = {
        statusCode: 200,
        body: JSON.stringify({message: 'User with id: ' + params.Key.userId + ' was updated successfully'})
      };
      callback(null, response);
    })
    .catch(err => {
      callback(null, {
        statusCode: err.statusCode || 500,
        body: JSON.stringify(err)
      });
    });
};

module.exports.Scan = (event, context, callback) => {
  dd.scan({TableName: TABLE_NAME}).promise()
    .then(res => {
      let response = {
        statusCode: 200,
        body: JSON.stringify(res)
      };
      callback(null, response);
    })
    .catch(err => {
      callback(null, {
        statusCode: err.statusCode || 500,
        body: JSON.stringify(err)
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
        let response = {
          statusCode: 200,
          body: JSON.stringify(res)
        };
        callback(null, response);
      })
      .catch(err => {
        callback(null, {
          statusCode: err.statusCode || 500,
          body: JSON.stringify(err)
        });
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
        let response = {
          statusCode: 200,
          body: JSON.stringify(res)
        };
        callback(null, response);
      })
      .catch(err => {
        callback(null, {
          statusCode: err.statusCode || 500,
          body: JSON.stringify(err)
        });
      });
  } else {
    params.body = {
      name: image.name.S,
      lastname: image.lastname.S, 
    };
    es.create(params)
      .then(res => {
        let response = {
          statusCode: 200,
          body: JSON.stringify(res)
        };
        callback(null, response);
      })
      .catch(err => {
        callback(null, {
          statusCode: err.statusCode || 500,
          body: JSON.stringify(err)
        });
      });
  }
};

module.exports.Search = (event, context, callback) => {
  let params = {
    q: event.queryStringParameters.q,
    size: event.queryStringParameters.size || 100,
    from: event.queryStringParameters.from || 0,
  };
  es.search(params)
    .then(res => {
      let response = {
        statusCode: 200,
        body: JSON.stringify(res)
      };
      callback(null, response);
    })
    .catch(err => {
      callback(null, {
        statusCode: err.statusCode || 500,
        body: JSON.stringify(err)
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