'use strict';

// Declare app level module which depends on filters, and services

var angularModules = angular.module('myApp', [
  'ui.bootstrap',
  'ui.router',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'ngResource',
  'ngCookies',
  'nvd3',
  'RDash',
  'ngSanitize',
  'timer',
  'angular.filter',
  'angularMoment',
  'FBAngular'
]);

var jiraHostName = 'https://issues.liferay.com';

var component = 'component in (Forms, subcomponents(LPS, Forms, \'true\'), \'Dynamic Data Lists\', subcomponents(LPS, \'Dynamic Data Lists\', \'true\'), \'Web Form\', subcomponents(LPS, \'Web Form\', \'true\'), \'Dynamic Data Mapping\', subcomponents(LPS, \'Dynamic Data Mapping\', \'true\'), Polls)';
var people = ['inacio.nery', 'adam.brandizzi', 'leonardo.barros', 'marcellus.tavares', 'rafael.praxedes', 'pedro.queiroz', 'lino.alves', 'adriano.interaminense', 'aline.cantarelli', 'clovis.neto', 'marcela.cunha'];

angularModules.value('config', {
  title: 'Metrics Dashboard',
  jiraHostName: jiraHostName,
  component: component,
  people: people,
  projects: ['"PUBLIC - Liferay Portal Community Edition"'],
  issueTypes: [
    'Bug', '"Regression Bug"', 'Task', 'Story', '"Technical Task"'
  ],
  completionTypes: [
    'Fixed', 'Completed'
  ],
  slideTimeInSecs: 45,
  updateTimeInMins: 10
});

angularModules.constant('routes', [
  {
    name: 'Metrics',
    url: 'metrics',
    icon: 'fa-bar-chart'
  }
  // , {
  //   name: 'JIRA',
  //   url: 'jira',
  //   icon: 'fa-child'
  // }
]);

angularModules.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
  $locationProvider.html5Mode(true);
});

angularModules.run(function(amMoment) {
  amMoment.changeLocale('en');
});