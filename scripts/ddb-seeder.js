var AWS = require("aws-sdk");
var fs = require('fs');
var uuid = require('uuid');

var docClient = new AWS.DynamoDB.DocumentClient();

console.log("Importing users into DynamoDB. Please wait.");

var allUsers = JSON.parse(fs.readFileSync('usersdata.json', 'utf8'));
allUsers.forEach(function(user) {
    var newDate = new Date().getTime();
    var params = {
        TableName: "UsersTable",
        Item: {
          userId: uuid.v1(),
          firstname: user.firstname,
          lastname: user.lastname,
          createdAt: newDate,
        }
    };

    docClient.put(params, function(err, data) {
       if (err) {
           console.error("Unable to add user", user.firstname, ". Error JSON:", JSON.stringify(err, null, 2));
       } else {
           console.log("PutItem succeeded:", user.firstname);
       }
    });
});