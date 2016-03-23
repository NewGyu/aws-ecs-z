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

    commander.command("runTask <taskName> [args...]")
      .description(`run tasks [${path.join(process.cwd(), self.config.runDefDir, "taskName.js")}]`)
      .action(function(taskName, args) {
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

    commander.command("deployTaskDef")
      .description(`create or replace TaskDefinition [${path.join(process.cwd(), self.config.taskDefDir, "*.js")}]`)
      .action(function() {
        co(function* () {
          TaskDefinition.AwsOpts = self.config.awsOpts;
          let taskdefs = glob.sync(path.join(process.cwd(), self.config.taskDefDir, "*.js"))
            .map(f => require(f))
            .map(json => new TaskDefinition(json));

          yield taskdefs.map(td => td.createOrUpdate());
          process.exit(0);
        }).catch(function(err) {
          console.error("operation failed!", err, err.stack);
          process.exit(1);
        });
      });

    commander.command("deployService")
      .description(`create or replace Service [${self.config.serviceDefDir}/*.js]`)
      .action(function() {
        co(function* () {
          Service.AwsOpts = self.config.awsOpts;
          let services = glob.sync(path.join(process.cwd(), self.config.serviceDefDir, "*.js"))
            .map(f => require(f))
            .map(json => new Service(json));
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