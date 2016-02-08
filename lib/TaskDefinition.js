"use strict";

const co = require("co");
const debug = require("debug")("ecs:taskdef");
const AWS = require("aws-sdk-promise");
var ECS = new AWS.ECS();

class TaskDefinition {
  /**
   * @param td taskDefinition
   * @param awsOpts
   */
  constructor(td) {
    this.def = td;
    this.debug = require("debug")(`ecs:taskdef:${td.family}:${td.revision}`);
  }
  
  static set AwsOpts(awsOpts) {
    ECS = new AWS.ECS(awsOpts);
  }
  
  createOrUpdate() {
    let self = this;
    return function*(){
      let taskDef = yield TaskDefinition.findTaskDefinition(self.def.family);
      if(taskDef) {
        self.debug(`updating... ${taskDef.family}:${taskDef.revision}->${self.def.revision}`);
        if(self.def.revision <= taskDef.revision) {
          console.log(`"${taskDef.family}" is already Up-To-Date (dsired=${self.def.revision}, current=${taskDef.revision})`)
          return;
        }
        let res = yield register(self.def);
        console.log(`TaskDefinition[${self.def.family}:${taskDef.revision}->${res.data.taskDefinition.revision}] was updated!`);
      } else {
        self.debug(`creating...`);
        let res = yield register(self.def);
        console.log(`TaskDefinition [${res.data.taskDefinition.family}:${res.data.taskDefinition.revision}] was created!`);
      }
    };
    
    function* register(taskDef) {
      let copied = {};
      Object.assign(copied, taskDef);
      delete copied.revision;
      let res = yield ECS.registerTaskDefinition(copied).promise();
      self.debug(JSON.stringify(res.data, null, 2));
      return res;
    }
  }
  
  static findTaskDefinition(taskDefName) {return co(function*(){
    let res = yield ECS.listTaskDefinitionFamilies({familyPrefix: taskDefName}).promise();
    debug("found", JSON.stringify(res.data));
    let f = res.data.families.filter(e=> e==taskDefName)[0];
    if(!f) return undefined;
    try {
      var res2 = yield ECS.describeTaskDefinition({taskDefinition: taskDefName}).promise();
      return res2.data.taskDefinition;
    } catch(err) {
      return undefined;
    }
  });}
}


module.exports = TaskDefinition;
