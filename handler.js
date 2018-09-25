'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const dd = new AWS.DynamoDB.DocumentClient({
  region: 'localhost',
  endpoint: 'http://localhost:8000'
});
const cs = new AWS.CloudSearchDomain({
  region: 'localhost',
  endpoint: 'http://localhost:15808',
  apiVersion: '2013-01-01'
});
const cs2 = new AWS.CloudSearchDomain({
  region: 'localhost',
  endpoint: 'http://localhost:15808?format=sdk',
  apiVersion: '2013-01-01'
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
        callback(null, {
          statusCode: error.statusCode || 501,
          message: 'Could not add user'
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
      console.log(error);
      callback(null, {
        statusCode: error.StatusCode || 501,
        message: 'Could not delete user'
      });
    });
};

module.exports.Scan = (event, context, callback) => {
  dd.scan({TableName: TABLE_NAME}).promise()
    .then(result => {
      callback(null, result);
    })
    .catch(error => {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        message: 'Could not scan'
      });
    });
};

/**
 * DYNAMODB-STREAMS AND CLOUDSEARCH
 */
 
module.exports.triggerStream = (event, context, callback) => {
  console.log('DDB Stream Triggered..')
  let record = event.Records[0];

  let data = {id : record.dynamodb.Keys.userId.S};
  let image = record.dynamodb.NewImage;

  // Delete record deleted from DynamoDB or fill data fields
  if (record.eventName === 'REMOVE') {
    data.type = 'delete';
    data.version = 1;
  } else {
    data.type = 'add';
    data.version = 1;
    data.fields = {
      name: image.name.S,
      lastname: image.lastname.S,
    };
  }

  let documents = [data];
  let params = {
    contentType: 'application/json',
    documents: JSON.stringify(documents)
  };

  cs.uploadDocuments(params, (err, data) => {
    if (err) console.error(err);      // an error occurred
    else console.log(data);           // successful response
  });
};

module.exports.Search = (event, context, callback) => {
  let params = {
    query: event,
    size: 100,
    start: 0,
  };
  console.log(params);
  
  cs2.search(params).promise()
    .then(result => {
      callback(null, result);
    })
    .catch(error => {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        message: 'Could not search'
      });
    });
};