appServices.factory('Statistics', function($resource, config) {

  var _dataMap = null;

  function generateStatsFromPeriodWindows(periodWindows) {
    var data = [];
    var i = 0;
    _.each(periodWindows, function(periodWindow) {
      var people = getPeopleFromWindow(periodWindow);
      var weeklyThroughput = getWeeklyThroughput(periodWindow);
      var throughputArray = weeklyThroughput.counts;
      var productivity = calculateProductivity(throughputArray) / people.length;
      var predictability = calculateStdDev(throughputArray) / calculateAverage(throughputArray);
      var week = moment(periodWindow[periodWindow.length - 1].startDate, 'DD/MM/YYYY').add('1', 'week').format('DD/MM/YYYY');

      data.push({
        i: i++,
        week: week,
        identifier: "throughput" + week.replace(/\//g, 'gap'),
        people: people,
        issueCount: weeklyThroughput.issues[weeklyThroughput.issues.length - 1].length,
        bugCount: countBugs(weeklyThroughput.issues[weeklyThroughput.issues.length - 1]),
        magnitudes: weeklyThroughput.magnitudes,
        throughput: throughputArray,
        throughputDates: weeklyThroughput.dates,
        total: ss.sum(throughputArray),
        average: Math.round(calculateAverage(throughputArray)),
        stddev: Math.round(calculateStdDev(throughputArray)),
        productivity: productivity,
        predictability: predictability
      });
    });

    return data;
  }

  function getDateMap() {
    if (_dataMap) {
      return _dataMap;
    }
    let date = moment("02/01/2016", 'DD/MM/YYYY');
    let now = moment(new Date()).add('1', 'week');
    _dataMap = new Map();
    while (date.isBefore(now)) {
      _dataMap.set(date.format('DD/MM/YYYY'), {
        issues: new Map(),
        open: 0,
        development: 0,
        review: 0,
        pm: 0,
        qa: 0,
        closed: 0
      });
      date = moment(date, 'DD/MM/YYYY').add('1', 'week');
    }
    return _dataMap;
  }

  function getDateFromMap(date) {
    var map = getDateMap();
    while (!map.get(date.format('DD/MM/YYYY'))) {
      date = date.add('1', 'day');
    }

    return date.format('DD/MM/YYYY');
  }

  function generateStoryStatsFromPeriodWindows(periodWindows) {
    var map = getDateMap();
    var data = [];
    var i = 0;
    _.each(periodWindows, function(periodWindow) {
      var week = moment(periodWindow[periodWindow.length - 1].startDate, 'DD/MM/YYYY').add('1', 'week').format('DD/MM/YYYY');
      data.push({
        i: i++,
        week: week,
        transitions: map.get(week)
      });
    });

    return data;
  }

  function generateStoryBucketsFromIssues(issues) {
    _.each(issues, function(issue) {
      let toString;
      let fromTime = moment(new Date(issue.fields.created));
      let toTime;
      let histories = issue.changelog.histories;
      for (var i = 0; i < histories.length; i++) {
        let history = histories[i];
        for (var k = 0; k < history.items.length; k++) {
          let item = history.items[k];
          if (item.field == 'status') {
            toTime = moment(new Date(history.created));
            while (fromTime.isBefore(toTime) || fromTime.isSame(toTime)) {
              populateTransitions(fromTime, item.fromString, issue);
              toString = item.toString;
              fromTime = fromTime.add('1', 'week');
            }
            fromTime = toTime;
          }
        }
      }

      if (toString) {
        toTime = moment(new Date());
        while (fromTime.isBefore(toTime) || fromTime.isSame(toTime)) {
          populateTransitions(fromTime, toString, issue);
          fromTime = fromTime.add('1', 'week');
        }
      }
    });
    return _dataMap;
  }

  function populateTransitions(fromTime, transition, issue) {
    let startDate = getDateFromMap(fromTime);

    let transitions = _dataMap.get(startDate);

    if (transitions.issues.get(issue.key) == transition) {
      return;
    }

    transitions.issues.set(issue.key, transition);

    if (transition == "Open" || transition == "Selected for Development" || transition == "Backlog" || transition == "Ready for Development" || transition == "Reopened" || transition == "Awaiting Manager Approval" || transition == "In Analysis" || transition == "Verified" || transition == "Ready for Estimation" || transition == "Analyzed") {
      transitions.open += 1;
    } else if (transition == "In Development" || transition == "In Progress" || transition == "In Design") {
      transitions.development += 1;
    } else if (transition == "In Review") {
      transitions.review += 1;
    } else if (transition == "Awaiting PM Review" || transition == "In PM Review") {
      transitions.pm += 1;
    } else if (transition == "Ready for QA") {
      transitions.qa += 1;
    } else if (transition == "Closed") {
      transitions.closed += 1;
    } else {
      console.error("Untreated transition: " + transition);
    }

    _dataMap.set(startDate, transitions);
  }

  function countBugs(issues) {
    var bugCount = 0;
    _.each(issues, function(issue) {
      if (issue.fields.issuetype.name === 'Bug') {
        bugCount++;
      }
    });
    return bugCount;
  }

  function createWeekBuckets() {
    var numberOfWeeks = 23;

    // The Graph should show up-to last week, except on Friday where it should include the current week.
    // So we add 2 days to the current date before calculating the endOf the week
    var endOfWeek = moment().add('2', 'days').endOf('week');
    var startOfBucket = moment(endOfWeek).subtract(numberOfWeeks, 'weeks');

    var buckets = [];
    for (var i = 0; i < numberOfWeeks; i++) {
      buckets.push({i: i, startDate: startOfBucket.format('DD/MM/YYYY'), issues: []});
      startOfBucket.add('1', 'week');
    }
    return buckets;
  }

  function generateResolvedBucketsFromIssues(issues) {
    var weekBuckets = createWeekBuckets();
    _.each(issues, function(issue) {
      var resolutionDate = moment(issue.fields.resolutiondate.substr(0, 10), 'YYYY-MM-DD');
      _.each(weekBuckets, function(bucket) {
        if (resolutionDate.isAfter(moment(bucket.startDate, 'DD/MM/YYYY')) && resolutionDate.isBefore(moment(bucket.startDate, 'DD/MM/YYYY').add('1', 'week'))) {
          bucket.issues.push(issue);
        }
      });
    });

    return weekBuckets;
  }

  function generateCreatedBucketsFromIssues(issues) {
    var weekBuckets = createWeekBuckets();
    _.each(issues, function(issue) {
      var resolutionDate = moment(issue.fields.created.substr(0, 10), 'YYYY-MM-DD');
      _.each(weekBuckets, function(bucket) {
        if (resolutionDate.isAfter(moment(bucket.startDate, 'DD/MM/YYYY')) && resolutionDate.isBefore(moment(bucket.startDate, 'DD/MM/YYYY').add('1', 'week'))) {
          bucket.issues.push(issue);
        }
      });
    });

    return weekBuckets;
  }

  function getPeriodWindows(weekBuckets) {
    var windows = [];
    for (i = 0; i < weekBuckets.length - 13; i++) {
      windows.push(weekBuckets.slice(i, i + 13));
    }
    return windows;
  }

  function getPeopleFromIssues(issues) {

    var people = [];
    _.each(issues, function(issue) {
      let names = issue.fields["customfield_12020"];
      if (names) {
        for (var i = 0, len = names.length; i < len; i++) {
          name = names[i].split('(')[0];
          if (config.people.indexOf(name) > -1) {
            people.push(name);
          }
        }
      }
    });

    return getUniquePeople(people);
  }

  function getPeopleFromWindow(periodWindow) {
    var people = [];
    _.each(periodWindow, function(periodIssues) {
      _.each(periodIssues.issues, function(issue) {
        let names = issue.fields["customfield_12020"];
        if (names) {
          for (var i = 0, len = names.length; i < len; i++) {
            name = names[i].split('(')[0];
            if (config.people.indexOf(name) > -1) {
              people.push(name);
            }
          }
        }
      });
    });

    return getUniquePeople(people);
  }

  function getUniquePeople(people) {
    var uniquePeople = _.map(_.groupBy(people, function(person) {
      return person;
    }), function(grouped) {
      return grouped[0];
    });

    return uniquePeople;
  }

  function getWeeklyThroughput(periodWindow) {

    var throughput = {
      magnitudes: [],
      counts: [],
      dates: [],
      issues: []
    };

    _.each(periodWindow, function(week) {
      var totalMagnitude = 0;
      for (i = 0; i < week.issues.length; i++) {
        var issue = week.issues[i];
        var magnitude = issue.fields["customfield_10193"];
        if (magnitude) {
          totalMagnitude += magnitude;
        }
      }

      throughput.magnitudes.push(totalMagnitude);
      throughput.counts.push(week.issues.length);
      throughput.issues.push(week.issues);
      throughput.dates.push(week.startDate);
    });

    return throughput;
  }

  function calculateProductivity(throughputArray, people) {
    return (ss.sum(throughputArray) / 13);
  }

  function calculateStdDev(throughputArray) {
    return ss.standard_deviation(throughputArray);
  }

  function calculateAverage(throughputArray) {
    return ss.average(throughputArray);
  }

  function generateGraphDataFromStat(stats) {
    var throughputData = [];
    var peopleData = [];

    var predictabilityData = [];
    var productivityData = [];

    var velocities = [];
    var magnitudes = [];

    for (var i = 0; i < stats.length; i++) {
      var stat = stats[i];
      var throughput = d3.round(stat.throughput[stat.throughput.length - 1]);
      var date = stat.week;
      throughputData.push({
        week: date,
        weekNumber: i + 1,
        type: format(throughput, 'issue', 'issues'),
        value: throughput
      });

      var people = d3.round(stat.people.length);
      peopleData.push({
        week: date,
        weekNumber: i + 1,
        type: 'people',
        value: people
      });

      var totalMagnitude = stat.magnitudes[stat.magnitudes.length - 1];
      magnitudes.push({
        week: date,
        weekNumber: i + 1,
        type: 'points',
        value: totalMagnitude
      });

      var velocity = totalMagnitude / stat.people.length / 5;
      velocities.push({
        week: date,
        weekNumber: i + 1,
        type: 'points/person/day',
        value: velocity
      });

      predictabilityData.push({
        week: date,
        weekNumber: i + 1,
        type: '',
        value: stat.predictability
      });

      productivityData.push({
        week: date,
        weekNumber: i + 1,
        type: '',
        value: stat.productivity
      });
    };

    return {
      throughputPeople: [
        {
          values: throughputData,
          key: 'JIRAs Resolved',
          area: true
        }, {
          values: peopleData,
          key: 'People'
        }, {
          values: magnitudes,
          key: 'Story Points Completed'
        }
      ],

      predictabilityProductivity: [
        {
          values: productivityData,
          key: 'Productivity',
          area: true
        }, {
          values: predictabilityData,
          key: 'Predictability',
          area: true
        }, {
          values: velocities,
          key: 'Velocity',
          area: true
        }
      ]
    };
  };

  function generateGraphStoryDataFromStat(stats) {
    var resolvedStories = [];
    var openDuration = [];
    var developmentDuration = [];
    var reviewDuration = [];
    var pmDuration = [];
    var qaDuration = [];
    var closeDuration = [];

    for (var i = 0; i < stats.length; i++) {
      var stat = stats[i];
      var date = stat.week;

      openDuration.push({
        issues: stat.issueCount,
        weekNumber: i + 1,
        type: 'days',
        value: d3.round(stat.transitions.open)
      });

      developmentDuration.push({
        issues: stat.issueCount,
        weekNumber: i + 1,
        type: 'days',
        value: d3.round(stat.transitions.development)
      });

      reviewDuration.push({
        issues: stat.issueCount,
        weekNumber: i + 1,
        type: 'days',
        value: d3.round(stat.transitions.review)
      });

      pmDuration.push({
        issues: stat.issueCount,
        weekNumber: i + 1,
        type: 'days',
        value: d3.round(stat.transitions.pm)
      });

      qaDuration.push({
        issues: stat.issueCount,
        weekNumber: i + 1,
        type: 'days',
        value: d3.round(stat.transitions.qa)
      });

      closeDuration.push({
        issues: stat.issueCount,
        weekNumber: i + 1,
        type: 'days',
        value: d3.round(stat.transitions.closed)
      });
    };

    return {
      resolvedStories: [
        {
          values: closeDuration,
          key: 'Closed',
          area: true
        }, {
          values: qaDuration,
          key: 'In QA',
          area: true
        }, {
          values: pmDuration,
          key: 'In PM',
          area: true
        }, {
          values: reviewDuration,
          key: 'In Review',
          area: true
        }, {
          values: developmentDuration,
          key: 'In Development',
          area: true
        }, {
          values: openDuration,
          key: 'Open',
          area: true
        }
      ]
    };
  };

  function generateCreatedVsResolvedData(createdBuckets, resolvedBuckets) {
    var createdData = [];
    var resolvedData = [];

    function addBucketCountTo(data) {
      var i = 0;
      var previousValue = 0;
      return function(bucket) {
        var count = previousValue + bucket.issues.length;
        previousValue = count;

        var date = bucket.startDate;
        data.push({
          week: date,
          weekNumber: i++,
          type: format(count, 'issue', 'issues'),
          value: count
        });
      }
    }

    _.each(createdBuckets, addBucketCountTo(createdData));
    _.each(resolvedBuckets, addBucketCountTo(resolvedData));

    return [
      {
        values: createdData,
        key: 'Created',
        color: '#d62728',
        //area: true
      }, {
        values: resolvedData,
        key: 'Resolved',
        color: '#2ca02c',
        //area: true
      }
    ]
  }

  function format(count, one, many) {
    return (count == 1
      ? one
      : many);
  }

  function generateStatsFromBuckets(weeklyBuckets) {
    var periodWindows = getPeriodWindows(weeklyBuckets);
    var stats = generateStatsFromPeriodWindows(periodWindows);

    return stats;
  }

  function generateStoryStatsFromBuckets() {
    var weekBuckets = createWeekBuckets();
    var periodWindows = getPeriodWindows(weekBuckets);
    var stats = generateStoryStatsFromPeriodWindows(periodWindows);
    return stats;
  }

  return {
    generateStoryBucketsFromIssues: generateStoryBucketsFromIssues,
    generateStoryStatsFromBuckets: generateStoryStatsFromBuckets,
    generateGraphStoryDataFromStat: generateGraphStoryDataFromStat,
    generateResolvedBucketsFromIssues: generateResolvedBucketsFromIssues,
    generateCreatedBucketsFromIssues: generateCreatedBucketsFromIssues,
    generateStatsFromBuckets: generateStatsFromBuckets,
    generateGraphDataFromStat: generateGraphDataFromStat,
    generateCreatedVsResolvedData: generateCreatedVsResolvedData,
    getPeopleFromIssues: getPeopleFromIssues
  };
});