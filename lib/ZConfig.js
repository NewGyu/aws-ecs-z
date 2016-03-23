"use strict";

const jsonschema = require("jsonschema");

const SCHEMA = {
  id: "/Config",
  type: "object",
  additionalProperties: true,
  properties: {
    runDefDir: {type: "string", minLength: 1},
    taskDefDir: {type: "string", minLength: 1},
    serviceDefDir: {type: "string", minLength: 1},
  },
  awsOpts: {type: "object"}
};

class ZConfig {
  constructor(cfg) {
    this.runDefDir = "./templates/rundef",
    this.taskDefDir = "./templates/taskdef",
    this.serviceDefDir = "./templates/service"
    for(var k in cfg) {
      this[k] = cfg[k];
    }
  }
  
  validate() {
    let validator = new jsonschema.Validator();
    let result = validator.validate(this, SCHEMA) || {};
    if(result.errors.length > 0) throw new Error(result.errors);
    return result;
  }
}


module.exports = ZConfig;