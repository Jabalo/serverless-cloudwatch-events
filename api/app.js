'use strict';

const serverless = require('serverless-http');
const express = require('express');
const app = express();

const aws = require('aws-sdk');
const credentials = require('../credentials.json');

const cloudWatchEvent = new aws.CloudWatchEvents(credentials);
const lambda = new aws.Lambda(credentials);

app.use(express.urlencoded({ extended: true }));

app.use(express.json());

// GET all Lambda Functions
app.get('/functions', (req, res) => {
  var params = {};

  lambda.listFunctions(params, (err, data) => {
    if (err) {
      console.log('ERROR', err, err.stack);
    } else {
      console.log('SUCCESS', data);
    }
  });
});

// GET all CloudWatch Rules
app.get('/events', (req, res) => {
  var params = {};

  cloudWatchEvent.listRules(params, (err, data) => {
    if (err) {
      console.log('ERROR', err, err.stack);
    } else {
      console.log('SUCCESS', data);
    }
  })
});

// POST new CloudWatch Rule + Target
app.post('/event', (req, res) => {
  const ruleName = req.body.Name;

  var ruleParams = {
    Name: ruleName,
    ScheduleExpression: 'rate(1 minute)',
    State: 'ENABLED'
  };

  cloudWatchEvent.putRule(ruleParams, (err, data) => {
    if (err) {
      console.log('ERROR', err, err.stack);
    } else {
      console.log('SUCCESS', data);
    }
  })
  .promise()
  .then(() => {

    var targetParams = {
      Rule: ruleParams.Name,
      Targets: [
        {
          Id: 'default',
          Arn: process.env.FUNCTION_ARN,
        }
      ]
    };
    return cloudWatchEvent.putTargets(targetParams, (err, data) => {
      if (err) {
        console.log('ERROR', err, err.stack);
      } else {
        console.log('SUCCESS', data);
      }
    })
    .promise();

  });
});

// DELETE a CloudWatch Rule
app.delete('/event', (req, res) => {
  const ruleName = req.body.Name;

  var targetParams = {
    Ids: [ 
      'default'
    ],
    Rule: ruleName,
  };

  cloudWatchEvent.removeTargets(targetParams)
    .promise()
    .then(() => {
      var ruleParams = {
        Name: ruleName
      };

      cloudWatchEvent.deleteRule(ruleParams, function(err, data) {
        if (err) {
          console.log('ERROR', err, err.stack);
        } else {
          console.log('SUCCESS', data);
        }
      });    
    })
});

module.exports.handler = serverless(app);
