"use strict";

const debug = require("debug")("ecs:EZCommander");
const co = require("co");
const glob = require("glob");
const path = require("path");
const commander = require("commander");

const ZConfig = require("./lib/ZConfig");
const Task = require("./lib/Task");
const Service = require("./lib/Service");
const TaskDefinition = require("./lib/TaskDefinition");

class EasyCommander {
  constructor(config) {
    this.config = new ZConfig(config);
    debug(JSON.stringify(this.config,null,2));
    this.config.validate();
  }

  exec(argv) {
    let self = this;
    console.log("NODE_ENV=", process.env.NODE_ENV);
    if (process.env.AWS_PROFILE) {
      console.log("AWS_PROFILE=", process.env.AWS_PROFILE);
    }

    /**
     * 
     */
    commander.command("runTask <taskName> [args...]")
      .description(`run tasks [${path.join(process.cwd(), self.config.runDefDir, "taskName.js")}]`)
      .action((taskName, args) => {
        co(function* () {
          Task.AwsOpts = self.config.awsOpts;
          let runDef = new Task(loadTaskRunDef());
          let r = yield runDef.run();
          console.log(r);
          process.exit(0);
        }).catch(function(err) {
          console.error("operation failed!", err, err.stack);
          process.exit(1);
        });

        function loadTaskRunDef() {
          var rundef = require(path.join(process.cwd(),self.config.runDefDir,`${taskName}.js`));
          if (typeof rundef == "function") {
            return rundef.apply(null, args);
          } else {
            return rundef;
          }
        }
      });
      
    /**
     * 
     */
    commander.command("deployTaskDef [taskDefName]")
      .description(`create or replace TaskDefinition [${path.join(process.cwd(), self.config.taskDefDir, "*.js")}]`)
      .action((taskDefName) => {
        TaskDefinition.AwsOpts = self.config.awsOpts;
        let fileSearchPath = path.join(process.cwd(), self.config.taskDefDir,  (taskDefName ? `${taskDefName}.js` : "*.js"));
        console.log(`searching ... [${fileSearchPath}]`);
        let taskdefs = glob.sync(fileSearchPath).map(f => new TaskDefinition(require(f)));
        co(function* () {
          yield taskdefs.map(td => td.createOrUpdate());
          process.exit(0);
        }).catch(err => {
          console.error("operation failed!", err, err.stack);
          process.exit(1);
        });
      });

    /**
     * 
     */
    commander.command("deployService [serviceName]")
      .description(`create or replace Service [${self.config.serviceDefDir}/*.js]`)
      .action((serviceName) => {
        Service.AwsOpts = self.config.awsOpts;
        let fileSearchPath = path.join(process.cwd(), self.config.serviceDefDir,  (serviceName ? `${serviceName}.js` : "*.js"));
        console.log(`searching ... [${fileSearchPath}]`);
        let services = glob.sync(fileSearchPath).map(f => new Service(require(f)));
        co(function* () {
          let r = yield services.map(sv => sv.createOrUpdate());
          console.log(r);
          process.exit(0);
        }).catch(function(err) {
          console.error("operation failed!", err, err.stack);
          process.exit(1);
        });
      });

    if (process.argv.length < 3) process.argv.push("--help");
    commander.parse(process.argv);
  }
}

module.exports = EasyCommander;