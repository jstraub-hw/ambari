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
var validator = require('utils/validator');
var componentHelper = require('utils/component');

App.MainHostController = Em.ArrayController.extend({
  name:'mainHostController',
  content: App.Host.find(),

  clearFilters: null,

  /**
   * Components which will be shown in component filter
   * @returns {Array}
   */
  componentsForFilter:function() {
    var installedComponents = componentHelper.getInstalledComponents();
    installedComponents.setEach('checkedForHostFilter', false);
    return installedComponents;
  }.property('App.router.clusterController.isLoaded'),

  /**
   * Master components
   * @returns {Array}
   */
  masterComponents:function () {
    return this.get('componentsForFilter').filterProperty('isMaster', true);
  }.property('componentsForFilter'),

  /**
   * Slave components
   * @returns {Array}
   */
  slaveComponents:function () {
    return this.get('componentsForFilter').filterProperty('isSlave', true);
  }.property('componentsForFilter'),

  /**
   * Client components
   * @returns {Array}
   */
  clientComponents: function() {
    return this.get('componentsForFilter').filterProperty('isClient', true);
  }.property('componentsForFilter'),

  /**
   * Filter hosts by componentName of <code>component</code>
   * @param {App.HostComponent} component
   */
  filterByComponent:function (component) {
    if(!component)
      return;
    var id = component.get('componentName');
    var column = 6;
    this.get('componentsForFilter').setEach('checkedForHostFilter', false);

    var filterForComponent = {
      iColumn: column,
      value: id,
      type: 'multiple'
    };
    App.db.setFilterConditions(this.get('name'), [filterForComponent]);
  },
  /**
   * On click callback for delete button
   */
  deleteButtonPopup:function () {
    var self = this;
    App.showConfirmationPopup(function(){
      self.removeHosts();
    });
  },

  showAlertsPopup: function (event) {
    var host = event.context;
    App.router.get('mainAlertsController').loadAlerts(host.get('hostName'), "HOST");
    App.ModalPopup.show({
      header: this.t('services.alerts.headingOfList'),
      bodyClass: Ember.View.extend({
        templateName: require('templates/main/host/alerts_popup'),
        controllerBinding: 'App.router.mainAlertsController',
        alerts: function () {
          return this.get('controller.alerts');
        }.property('controller.alerts'),

        closePopup: function () {
          this.get('parentView').hide();
        }
      }),
      primary: Em.I18n.t('common.close'),
      secondary : null,
      didInsertElement: function () {
        this.$().find('.modal-footer').addClass('align-center');
        this.$().children('.modal').css({'margin-top': '-350px'});
      }
    });
    event.stopPropagation();
  },

  /**
   * remove selected hosts
   */
  removeHosts:function () {
    var hosts = this.get('content');
    var selectedHosts = hosts.filterProperty('isChecked', true);
    selectedHosts.forEach(function (_hostInfo) {
      console.log('Removing:  ' + _hostInfo.hostName);
    });
    this.get('fullContent').removeObjects(selectedHosts);
  },

  /**
   * remove hosts with id equal host_id
   * @param {String} host_id
   */
  checkRemoved:function (host_id) {
    var hosts = this.get('content');
    var selectedHosts = hosts.filterProperty('id', host_id);
    this.get('fullContent').removeObjects(selectedHosts);
  },

  /**
   * Do bulk operation for selected hosts or hostComponents
   * @param {Object} operationData - data about bulk operation (action, hosts or hostComponents etc)
   * @param {Array} hostNames - list of affected hostNames
   */
  bulkOperation: function(operationData, hostNames) {

  }

});
