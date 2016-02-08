"use strict";

const co = require("co");
const debug = require("debug")("ecs:service");
const AWS = require("aws-sdk-promise");
var ECS = new AWS.ECS();

class Service {
  constructor(serviceDef) {
    this.def = serviceDef;
    this.debug = require("debug")(`ecs:service:${serviceDef.serviceName}`);
  }
  
   static set AwsOpts(awsOpts) {
    ECS = new AWS.ECS(awsOpts)
  }
  
  createOrUpdate() {
    let self = this;
    return function*(){
      let sv = yield Service.findService(self.def.cluster, self.def.serviceName);
      if(sv) {
        self.debug("updating ...");
        if(sv.status == "INACTIVE") {
          yield deleteServie(self.def.cluster, self.def.serviceName);
          yield createService(self.def);
        } else {
          yield updateService(self.def);
        }
      } else {
        yield createService(self.def);
      }
    }
    
    function* createService(svdef) {
      self.debug("creating ...");
      let res = yield ECS.createService(svdef).promise();
      self.debug(res.data);
      console.log(`Service [${res.data.service.serviceArn}] was created!`);
    }
    
    function* deleteServie(cluster, serviceName) {
      self.debug("deleting...");
      let res = yield ECS.deleteService({
        service: serviceName,
        cluster: cluster
      }).promise();
      self.debug("delete",JSON.stringify(res.data, null, 2));
      console.log(`Service [${serviceName}] was deleted!`);
    }
    
    function* updateService(svdef) {
      let copy = {};
      Object.assign(copy, svdef);
      copy.service = svdef.serviceName;
      delete copy.serviceName;
      delete copy.loadBalancers;
      delete copy.role;
      let res = yield ECS.updateService(copy).promise();
      self.debug("update",JSON.stringify(res.data,null,2));
      console.log(`Service [${res.data.service.serviceArn}] was updated!`);
    }
  }
  
  static findService(clusterName, serviceName) {
    return function*() {
      let res = yield ECS.describeServices({
        cluster: clusterName,
        services: [serviceName]
      }).promise();
      debug("find", JSON.stringify(res.data,null,2));
      return res.data.services[0];
    }
  }
}

module.exports = Service;