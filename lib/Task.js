"use strict";

const co = require("co");
const debug = require("debug")("ecs:task");
const AWS = require("aws-sdk-promise");
var ECS = new AWS.ECS();

class Task {
  constructor(runDefinition) {
    this.def = runDefinition;
    this.debug = require("debug")(`ecs:task:${runDefinition.taskDefinition}`);
  }
  
  static set AwsOpts(awsOpts) {
    ECS = new AWS.ECS(awsOpts)
  }
  
  /**
   * タスクを実行する
   * @return 実行できた場合はタスクの情報
   */
  run() {
    let self = this;
    return function*() {
      self.debug("Task requesting...", JSON.stringify(self.def,null,2));
      let res = yield runTask(self.def);
      self.debug(JSON.stringify(res.data,null,2));
      if(res.data.tasks[0]) {
        let task = res.data.tasks[0];
        console.log(`[${task.taskArn}] Run at Cluster [${task.clusterArn}]`);
        return task;
      } else if (res.data.failures && res.data.failures.length > 0) {
        res.data.failures.forEach(f => console.error(f.arn, f.reason));
        throw new Error("Task run failed !", res.data.failures);
      } else {
        //たぶんここには来ない
        throw new Error("Task run failed !");
      }
    }
    
    function* runTask(def) {
      try {
        return yield ECS.runTask(def).promise();
      } catch(err) {
        console.error("request failed!", err);
        console.error("run definition =", JSON.stringify(def,null,2));
        throw err;
      }
    }
  }
}

module.exports = Task;