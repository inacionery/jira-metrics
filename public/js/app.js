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

angularModules.value('config', {
  title: 'Metrics Dashboard',
  jiraHostName: jiraHostName,
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
  }, {
    name: 'Activity',
    url: 'activity',
    icon: 'fa-quote-right'
  }, {
    name: 'JIRA',
    url: 'jira',
    icon: 'fa-child'
  }
]);

angularModules.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
  $locationProvider.html5Mode(true);
});

angularModules.run(function(amMoment) {
  amMoment.changeLocale('en');
});