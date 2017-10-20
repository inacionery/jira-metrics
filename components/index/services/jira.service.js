appServices.factory('JIRA', function($resource, config) {
  return {
    throughputData: $resource('api/throughputData', {
      jiraHostName: config.jiraHostName,
      'projects[]': config.projects,
      'completionTypes[]': config.completionTypes,
      issueTypes: config.issueTypes
    }, {
      get: {
        method: 'GET',
        cache: true
      }
    }),

    dailyCreated: $resource('api/search', {
      jiraHostName: config.jiraHostName,
      'projects[]': config.projects,
      issueTypes: config.issueTypes,
      search: 'created >= "-1d 1h" AND component in (subcomponents(LPS, Workflow, "true"), subcomponents(LPS, "Business Productivity", "true"),subcomponents(LPS, Calendar, "true"))'
    }, {
      get: {
        method: 'GET',
        cache: true
      }
    }),

    created: $resource('api/searchSimple', {
      jiraHostName: config.jiraHostName,
      'projects[]': config.projects,
      issueTypes: config.issueTypes,
      search: 'created >= endOfWeek(-23) AND component in (subcomponents(LPS, Workflow, "true"), subcomponents(LPS, "Business Productivity", "true"),subcomponents(LPS, Calendar, "true"))'
    }, {
      get: {
        method: 'GET',
        cache: true
      }
    }),

    resolved: $resource('api/searchSimple', {
      jiraHostName: config.jiraHostName,
      'projects[]': config.projects,
      issueTypes: config.issueTypes,
      search: 'resolutiondate >= endOfWeek(-23) AND component in (subcomponents(LPS, Workflow, "true"), subcomponents(LPS, "Business Productivity", "true"),subcomponents(LPS, Calendar, "true"))'
    }, {
      get: {
        method: 'GET',
        cache: true
      }
    }),

    unfinishedJIRAs: $resource('api/unfinished', {
      jiraHostName: config.jiraHostName,
      'projects[]': config.projects,
      search: 'component in (subcomponents(LPS, Workflow, "true"), subcomponents(LPS, "Business Productivity", "true"),subcomponents(LPS, Calendar, "true"))'
    }, {
      get: {
        method: 'GET',
        cache: true
      }
    })
  };
});