/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var App = require('app');
var stringUtils = require('utils/string_utils');

require('controllers/main/service/info/configs');

App.MainAdminServiceAccountsController = App.MainServiceInfoConfigsController.extend({
  name: 'mainAdminServiceAccountsController',
  users: null,
  serviceConfigTags: [],
  content: Em.Object.create({
    serviceName: 'MISC'
  }),
  loadUsers: function () {
    this.set('selectedService', this.get('content.serviceName') ? this.get('content.serviceName') : "MISC");
    this.loadServiceConfig();
  },
  loadServiceConfig: function () {
    App.ajax.send({
      name: 'config.tags',
      sender: this,
      data: {
        serviceName: this.get('selectedService'),
        serviceConfigsDef: this.get('serviceConfigs').findProperty('serviceName', this.get('selectedService'))
      },
      success: 'loadServiceTagSuccess'
    });
  },
  loadServiceTagSuccess: function (data, opt, params) {
    var self = this;
    var installedServices = App.Service.find().mapProperty("serviceName");
    var serviceConfigsDef = params.serviceConfigsDef;
    var serviceName = this.get('selectedService');
    var loadedClusterSiteToTagMap = {};

    for (var site in Em.get(data, 'Clusters.desired_configs')) {
      if (serviceConfigsDef.configTypes.hasOwnProperty(site)) {
        loadedClusterSiteToTagMap[site] = data.Clusters.desired_configs[site]['tag'];
      }
    }
    this.setServiceConfigTags(loadedClusterSiteToTagMap);
    // load server stored configurations
    App.router.get('configurationController').getConfigsByTags(this.get('serviceConfigTags')).done(function (serverConfigs) {
      // load configurations list for installed services
      App.config.loadAdvancedConfigPartial(installedServices, {
        queryFilter: 'configurations/StackConfigurations/property_type.matches(.*[USER,GROUP].*)'
      }, function(advancedConfigs) {
        // load cluster configs
        App.config.loadClusterConfig(function(clusterConfigs) {
          self.createConfigObject(serverConfigs, advancedConfigs.concat(clusterConfigs));
        });
      });
    });
  },


  /**
   * Changes format from Object to Array
   *
   * {
   *  'core-site': 'version1',
   *  'hdfs-site': 'version1',
   *  ...
   * }
   *
   * to
   *
   * [
   *  {
   *    siteName: 'core-site',
   *    tagName: 'version1',
   *    newTageName: null
   *  },
   *  ...
   * ]
   *
   * set tagnames for configuration of the *-site.xml
   * @private
   * @method setServiceConfigTags
   */
  setServiceConfigTags: function (desiredConfigsSiteTags) {
    var newServiceConfigTags = [];
    for (var index in desiredConfigsSiteTags) {
      newServiceConfigTags.pushObject({
        siteName: index,
        tagName: desiredConfigsSiteTags[index],
        newTagName: null
      }, this);
    }
    this.set('serviceConfigTags', newServiceConfigTags);
  },

  /**
   * Generate configuration object that will be rendered
   *
   * @param {Object[]} serverConfigs
   * @param {Object[]} advancedConfigs
   */
  createConfigObject: function(serverConfigs, advancedConfigs) {
    var configSet = App.config.mergePreDefinedWithLoaded(serverConfigs, advancedConfigs, this.get('serviceConfigTags'), this.get('selectedService'));
    var miscConfigs = configSet.configs.filterProperty('serviceName', this.get('selectedService')).filterProperty('category', 'Users and Groups').filterProperty('isVisible', true).rejectProperty('displayType', 'password').rejectProperty('displayType', 'checkbox');

    miscConfigs = App.config.miscConfigVisibleProperty(miscConfigs, App.Service.find().mapProperty('serviceName').concat('MISC'));

    // load specific users along the wizards which called <code>loadUsers</code> method
    var wizardContentProperties = [
      {key: 'group', configName: 'user_group'},
      {key: 'smokeuser', configName: 'smokeuser'},
      {key: 'hdfsUser', configName: 'hdfs_user'}
    ];
    wizardContentProperties.forEach(function(item) {
      this.setContentProperty(item.key, item.configName, miscConfigs);
    }, this);
    this.set('users', miscConfigs.filterProperty('isVisible'));
    this.set('dataIsLoaded', true);
  },
  /**
   * set config value to property of "content"
   * @param key
   * @param configName
   * @param misc_configs
   * @return {Boolean}
   */
  setContentProperty: function (key, configName, misc_configs) {
    var content = this.get('content');
    if (key && configName && misc_configs.someProperty('name', configName) && content.get(key)) {
      content.set(key, misc_configs.findProperty('name', configName).get("value"));
      return true;
    }
    return false;
  },
  /**
   * sort miscellaneous configs by specific order
   * @param sortOrder
   * @param arrayToSort
   * @return {Array}
   */
  sortByOrder: function (sortOrder, arrayToSort) {
    var sorted = [];
    if (sortOrder && sortOrder.length > 0) {
      sortOrder.forEach(function (name) {
        var user = arrayToSort.findProperty('name', name);
        if (user) {
          sorted.push({
            isVisible: user.get('isVisible'),
            displayName: user.get('displayName'),
            value: user.get('value')
          });
        }
      });
      return sorted;
    } else {
      return arrayToSort;
    }
  },
  /**
   * set displayName of "proxyuser_group" depending on stack version
   * @param misc_configs
   */
  setProxyUserGroupLabel: function (misc_configs) {
    var proxyUserGroup = misc_configs.findProperty('name', 'proxyuser_group');
    //stack, with version lower than 2.1, doesn't have Falcon service
    if (proxyUserGroup) {
      var proxyServices = ['HIVE', 'OOZIE', 'FALCON'];
      var services = Em.A([]);
      proxyServices.forEach(function (serviceName) {
        var stackService = App.StackService.find(serviceName);
        if (stackService) {
          services.push(stackService.get('displayName'));
        }
      }, this);
      proxyUserGroup.set('displayName', "Proxy group for " + stringUtils.getFormattedStringFromArray(services));
    }
  }
});
