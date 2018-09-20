'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');
const dd = new AWS.DynamoDB.DocumentClient({
  region: 'localhost',
  endpoint: 'http://localhost:8000'
});
const TABLE_NAME = "usersTable";

module.exports.PutItem = (event, context, callback) => {
    let params = {
      TableName: TABLE_NAME,
      Item: {
        userId: uuid.v1(),
        name: event.name,
        lastname: event.lastname
      }
    };

    // WITH ASYNC function
    // let result = await dd.put(params).promise();

    // let response = {
    //   statusCode: 200,
    //   body: params.Item
    // };

    // return response;

    // WITH callback
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
          headers: { 'Content-Type': 'text/plain' },
          body: 'Couldn\'t create the user.',
        });
      });
};

module.exports.Scan = (event, context, callback) => {
  dd.scan({TableName: TABLE_NAME}).promise()
    .then(result => {
      callback(null, result)
    })
    .catch(error => {
      console.error(error);
      callback(null, "nope")
    })
}

module.exports.triggerStream = (event, context, callback) => {
  console.log('stream triggered');

  let eventData = event;
  console.log(eventData);
};

